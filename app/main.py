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

full_html_template = """
<div class="lab-report">
  <header>
    <p><strong>Date:</strong> [YYYY-MM-DD] | <strong>Time:</strong> [HH:MM or Time Range]</p>
    <h2>Experiment Title: [Concise and descriptive title]</h2>
  </header>

  <section>
    <h3>Objective</h3>
    <p>[Purpose or hypothesis]</p>
  </section>

  <section>
    <h3>Background / Rationale</h3>
    <p>[Scientific context]</p>
  </section>

  <section>
    <h3>Materials and Reagents</h3>
    <ul>
      <li>[Item with concentration/catalog number]</li>
    </ul>
  </section>

  <section>
    <h3>Equipment</h3>
    <ul>
      <li>[Instrument/Software name]</li>
    </ul>
  </section>

  <section>
    <h3>Experimental Procedure</h3>
    <ol>
      <li>[Step in third person passive voice]</li>
    </ol>
  </section>

  <section>
    <h3>Observations</h3>
    <p>[Visuals, measurements, anomalies]</p>
  </section>

  <section>
    <h3>Results</h3>
    <p>[Summarized data or yield]</p>
  </section>

  <section>
    <h3>Data Analysis</h3>
    <p>[Calculations or statistical methods]</p>
  </section>

  <section>
    <h3>Discussion</h3>
    <p>[Interpretation and comparison]</p>
  </section>

  <section>
    <h3>Conclusion</h3>
    <p>[2-3 sentence summary]</p>
  </section>

  <section>
    <h3>Next Steps / Future Work</h3>
    <p>[Follow-up or optimizations]</p>
  </section>

  <section>
    <h3>References</h3>
    <ul>
      <li>[Relevant papers or protocols]</li>
    </ul>
  </section>
</div>
"""


def get_result(image_base64) -> tuple[str, str]:
    # Define the request body
    prompt_text = f"""
    You are a scientific assistant. Analyze the lab notebook image and extract the content into this EXACT HTML structure:
    {full_html_template}

    Requirements:
    - Use <ul>/<li> for Materials, Equipment, and References.
    - Use <ol>/<li> for the Experimental Procedure.
    - Use third-person passive voice.
    - OUTPUT ONLY THE RAW HTML. No markdown code blocks, no preface.
    """

    request_body = {
        "inferenceConfig": {"max_new_tokens": 2000},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"image": {"format": "jpeg", "source": {"bytes": image_base64}}},
                    {"text": prompt_text},
                ],
            },
        ],
    }

    try:
        response = BEDROCK_CLIENT.invoke_model(
            modelId=MODEL_NAME,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )

        response_body = json.loads(response["body"].read().decode("utf-8"))
        raw_text = response_body["output"]["message"]["content"][0]["text"].strip()

        # 1. Remove Markdown code fences if the LLM included them
        if raw_text.startswith("```"):
            # Split by backticks and take the content inside
            # This handles ```html ... ``` and ``` ... ```
            parts = raw_text.split("```")
            if len(parts) >= 3:
                cleaned_html = parts[1]
                # Remove the "html" language identifier if present at the start
                if cleaned_html.lower().startswith("html"):
                    cleaned_html = cleaned_html[4:].strip()
                raw_text = cleaned_html

        # 2. Final trim to ensure no stray whitespace
        result_html = raw_text.strip()

        return result_html, ""

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
            print(f"PATCH {experiment_id} operation is {status}: {response.status}")
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
