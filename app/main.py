"""App entrypoint (aka. InvokeModel Lambda Function).

AWS SQS will feed this lambda to invoke AWS Bedrock LLM model.

Notes:
- To test 'DLQ', return 'raise Exception(f"DLQ test for {message_body}")'
"""

import base64
import json
import urllib.error
import urllib.request
from urllib.parse import urlencode

import boto3

_VERSION: str = "0.1.1dev"
_REGION_NAME: str = "eu-central-1"
MODEL_NAME = "eu.amazon.nova-pro-v1:0"
BEDROCK_CLIENT = boto3.client("bedrock-runtime", region_name=_REGION_NAME)
S3_CLIENT = boto3.client("s3", region_name=_REGION_NAME)
S3_BUCKET_NAME: str = "labjournalai-input-images-prod"
API_ENDPOINT: str = "https://abpa6z6ap46nb5sxdi4trcp3hi0scfza.lambda-url.eu-central-1.on.aws"


template = """
Date: [YYYY-MM-DD]
Time: [HH:MM or Time Range]

Experiment Title: [Concise and descriptive title]

Objective:
[Clearly state the purpose or hypothesis of the experiment — what is being tested or demonstrated.]

Background / Rationale:
[Provide a short scientific context or literature basis, if available.]

Materials and Reagents:
[List every reagent, material, or consumable, including concentrations and catalog numbers if available.]

Equipment:
[List all instruments, machines, software, or tools used, including model names if known.]

Experimental Procedure:
[Organize by steps, numbered or bulleted. Write in past tense and third person passive voice.]

Example:
1. [Describe first major step, including quantities, timings, and conditions (e.g., "The mixture was incubated at 37°C for 30 minutes.")].
2. [Next step…]
3. [Continue until experiment completion.]

Observations:
[Record visual observations, measurements, or anything unusual (color changes, precipitation, pH, etc.).]

Results:
[Summarize raw or processed data, yield, or measurements. You may attach or reference data files or figures here.]

Data Analysis:
[State how data were processed — calculations, statistical analyses, plots, etc.]

Discussion:
[Interpret the results, mention anomalies, compare with expectations, cite literature if needed.]

Conclusion:
[Summarize outcomes in 2-3 sentences, including whether the objective was achieved.]

Next Steps / Future Work:
[Propose any follow-up experiments, optimizations, or validations.]

References:
[List all relevant papers, manuals, or standard protocols referenced.]

"""


def get_result(image_base64) -> tuple[str, str]:
    # Define the request body
    request_body = {
        "inferenceConfig": {"max_new_tokens": 1200},
        "messages": [
            {
            "role": "system",
            "content": [
                {
                    "text": """
                You are a scientific assistant helping digitize laboratory notebook pages.
                Analyze the image of a handwritten or printed lab notebook page.
                Extract all relevant experimental details, correct spelling and grammar, and rewrite the content in clear, formal scientific English.
                Convert the information into structured text following the exact format below.
                Use full sentences, proper scientific terminology, and preserve all experimental details such as dates, times, quantities, concentrations, and steps.
                Do not invent missing data — if something is unreadable or missing, write "[unreadable]" or "[missing]".

                Style requirements:
                - Use complete sentences.
                - Use third person passive voice (e.g., "The solution was mixed" instead of "I mixed the solution").
                - Follow standard scientific structure and clarity.
                - Standardize symbols and units (e.g., µL, °C, g, min).
                - Do not add commentary outside the template.
                - Output only the formatted text with no preface, headers, or explanations.
            """
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "jpeg",  # Or "png", depending on your source
                            "source": {"bytes": image_base64},
                        }
                    },
                    {
                        "text": f"""
Now, transcribe and structure the laboratory notebook image accordingly.
Format your output using this template:

{template}
"""
                    },
                ],
            },
        ],
    }

    # Invoke the model using invoke_model
    try:
        response = BEDROCK_CLIENT.invoke_model(
            modelId=MODEL_NAME,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )

        # Decode the response body
        response_body = json.loads(response["body"].read().decode("utf-8"))

        # Extract the response text
        response_text = response_body["output"]["message"]["content"][0]["text"]
        return response_text, ""

    except Exception as e:
        return "", f"Error: {e}"


def send_patch_request(experiment_id: str, result: str, error: str) -> dict[str, str]:
    status = "Completed" if error == "" else "Failed"
    payload = {"status": status, "result": result, "error": error}

    url = f"{API_ENDPOINT}/experiments/{experiment_id}"

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "Content-Length": str(len(data))},
            method="PATCH",
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            print(f"PATCH {experiment_id} successful: {response.status}")
            return {"statusCode": "200", "body": '{"message": "Experiment status updated"}'}

    except urllib.error.HTTPError as e:
        print(f"PATCH {experiment_id} HTTP {e.code}: {e.reason}")
        return {"statusCode": str(e.code), "body": json.dumps({"error": f"HTTP {e.code}: {e.reason}"})}
    except Exception as e:
        print(f"PATCH {experiment_id} failed: {str(e)}")
        return {"statusCode": "500", "body": json.dumps({"error": str(e)})}


def lambda_handler(event, context):
    for record in event["Records"]:
        # Extract message body from the record
        message_body = json.loads(record["body"])
        print(f"Message Body: {message_body}")
        experiment_id = message_body["experiment_id"]
        print(f"{experiment_id=}")

        # Download image
        obj = S3_CLIENT.get_object(Bucket=S3_BUCKET_NAME, Key=experiment_id)
        image_bytes = obj["Body"].read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        # get model result
        result, error = get_result(image_base64)
        print(f"{result=} \n\n {error=}")
        # save model result
        response = send_patch_request(experiment_id, result, error)
        print(response)
