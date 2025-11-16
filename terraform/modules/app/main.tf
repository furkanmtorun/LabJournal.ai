# Notes
## -> 'receive_wait_time_seconds' : How long should I wait for new messages before giving up?
## -> 'visibility_timeout_seconds': How long should I hide this message from others while it’s being processed?
## -> Time for 'visibility_timeout_seconds' should be equal or more than the timeout of consumer (lambda here).

# ==============
# S3
# ==============
## S3 Bucket to store input images
resource "aws_s3_bucket" "input_images" {
  bucket = var.input_images_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = var.input_images_bucket_name
    Environment = "${terraform.workspace}"
  }
}

# ==============
# SQS
# ==============
## SQS: Submitting experiments
resource "aws_sqs_queue" "submit_experiments" {
  name                       = "queue-for-submit-experiments"
  fifo_queue                 = false # Standard queue is fine since order doesn't matter
  sqs_managed_sse_enabled    = true  # AWS-managed encryption for data security
  delay_seconds              = 0
  max_message_size           = 262144 # 256 KB (max allowed, safer for large payloads)
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = 180    # Allow Lambda up to 3 minutes to complete before retry
  receive_wait_time_seconds  = 20     # Enable long polling to reduce Lambda trigger costs

  # Configure Dead Letter Queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letters_for_experiments.arn
    maxReceiveCount     = 5 # After 5 failed receives, message moves to DLQ
  })

  tags = {
    Name        = "AWS SQS for triggering Bedrock Lambda Invocations"
    Environment = terraform.workspace
  }
}

## SQS: Dead-letter queue (DLQ) to capture problematic messages
resource "aws_sqs_queue" "dead_letters_for_experiments" {
  name                       = "dead-letter-queue-for-submit-experiments"
  fifo_queue                 = false
  sqs_managed_sse_enabled    = true    # Enable server-side encryption for compliance and safety
  message_retention_seconds  = 1209600 # 14 days (max retention for DLQ)
  visibility_timeout_seconds = 60      # Slightly longer to allow reprocessing if needed
  receive_wait_time_seconds  = 20      # Enable long polling to reduce Lambda trigger costs

  tags = {
    Name        = "AWS SQS Dead Letter Queue for LLM Experiments"
    Environment = terraform.workspace
  }
}

resource "aws_iam_policy" "lambda_sqs_policy" {
  name = "lambda-sqs-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = "arn:aws:sqs:eu-central-1:851725270120:${aws_sqs_queue.submit_experiments.name}"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_sqs_policy_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_sqs_policy.arn
}

# ==============
# Lambda
# ==============
## Role: 'InvokeLambda' Lambda function to call AWS Bedrock
resource "aws_iam_role" "lambda_role" {
  name = "invoke-model-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

## Attachment: Basic execution policy (for CloudWatch logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

## Zip: Package main.py file into lambda.zip automatically
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.root}/../../app/main.py"
  output_path = "${path.root}/../../app/lambda.zip"
}

## Package and deploy Lambda function
resource "aws_lambda_function" "invoke_model" {
  function_name    = "invoke-model-lambda"
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.12"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30
  memory_size      = 256

  tags = {
    Name        = "InvokeModel Lambda"
    Environment = "${terraform.workspace}"
  }
}

# SQS -> Lambda: Triggers 'InvokeModel' lambda (aka. 'app')
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.submit_experiments.arn
  function_name    = aws_lambda_function.invoke_model.arn
  enabled          = true
  batch_size       = 1 # Bedrock is a heavy job, so a slow job should not delay the other in the same batch

  scaling_config {
    # If Bedrock and InvokeModel lambda both handle more parallelism, safely increase this limit.
    maximum_concurrency = 10
  }

  # Without this, a single failed message would cause the entire batch to be retried.
  function_response_types = ["ReportBatchItemFailures"]

}


