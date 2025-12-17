"""App entrypoint (aka. InvokeModel Lambda Function).

AWS SQS will feed this lambda to invoke AWS Bedrock LLM model.

Notes:
- To test 'DLQ', return 'raise Exception(f"DLQ test for {message_body}")'
"""

import base64
import boto3
import json
import urllib.error
import urllib.request
from urllib.parse import urlencode


_VERSION: str = "0.1.1dev"
_REGION_NAME: str = "eu-central-1"
MODEL_NAME = "eu.amazon.nova-pro-v1:0"
BEDROCK_CLIENT = boto3.client("bedrock-runtime", region_name=_REGION_NAME)
S3_CLIENT = boto3.client("s3", region_name=_REGION_NAME)
S3_BUCKET_NAME: str = "labjournalai-input-images-prod"
API_ENDPOINT: str = "https://abpa6z6ap46nb5sxdi4trcp3hi0scfza.lambda-url.eu-central-1.on.aws"


template = """
Date: [Insert Date]

Time: [Insert Time]

Experiment Title: [Insert Title]

Aim: [Briefly describe what you aim to achieve with this experiment]

Materials:
[List all materials, reagents, and equipment used]

Protocols:

1. [Protocol Name]
Materials: [List specific materials for this protocol]
Procedure:

- Step 1: [Detailed step]
- Step 2: [Detailed step]
- Step 3: [Detailed step]
Observations/Notes: [Any observations or deviations from the protocol]

2. [Protocol Name]
Materials: [List specific materials for this protocol]
Procedure:

- Step 1: [Detailed step]
- Step 2: [Detailed step]
- Step 3: [Detailed step]
Observations/Notes: [Any observations or deviations from the protocol]

3. [Protocol Name]
Materials: [List specific materials for this protocol]
Procedure:
- Step 1: [Detailed step]
- Step 2: [Detailed step]
- Step 3: [Detailed step]
Observations/Notes: [Any observations or deviations from the protocol]

Results: [Summarize the results or attach data]

Discussion: [Interpret the results, discuss any issues or successes]

Conclusion: [Summarize the findings and next steps]

References: [List any literature or sources referenced]
"""


def get_result(image_base64) -> tuple[str, str]:
    # Define the request body
    request_body = {
        "inferenceConfig": {"max_new_tokens": 1000},
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "jpeg",  # Adjust based on your image format
                            "source": {"bytes": image_base64},
                        }
                    },
                    {
                        "text": f"""This is a lab journal about the experiment. Convert this photo of the page into the text. 
                        Fix the grammar, turn them into scientific sentences and fit the content into this template: {template}."""
                    },
                ],
            }
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
