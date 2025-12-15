"""App entrypoint (aka. InvokeModel Lambda Function).

AWS SQS will feed this lambda to invoke AWS Bedrock LLM model.

Notes:
- To test 'DLQ', return 'raise Exception(f"DLQ test for {message_body}")'
"""

import boto3
import json
_VERSION: str = "0.1.0dev"
_REGION_NAME: str = "eu-central-1"
_TIME_FORMAT: str = "%d.%m.%Y %H:%M:%S"

def lambda_handler(event, context):
    for record in event['Records']:
        # Extract message body from the record
        message_body = record['body']
        
        # Process the message (e.g., logging or business logic)
        print(f"Message Body: {message_body}")
        
    return {
        'statusCode': 200,
        'body': json.dumps('Message processed successfully')
    }