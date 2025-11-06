# S3 Bucket to store input images
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

# SQS: Submitting experiments
resource "aws_sqs_queue" "submit_experiments" {
  name                    = "sqs_for_submit_experiments"
  delay_seconds           = 0
  fifo_queue              = false # We pick 'standard queue' over 'FIFO' as we do not care the order.
  sqs_managed_sse_enabled = true

  max_message_size = 2048

  receive_wait_time_seconds  = 10     # 20 (max) -> "long polling" | 0 (min) -> "short polling"
  visibility_timeout_seconds = 60     # timeout for Lambda processing
  message_retention_seconds  = 345600 # 4 days retention for main queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letters_for_experiments.arn
    maxReceiveCount     = 5 # After 5 failed receives, message goes to DLQ
  })

  tags = {
    Name        = "AWS SQS for triggering InvokeModel lambda func."
    Environment = "${terraform.workspace}"
  }
}

# SQS: Dead-letter queue (DLQ) to capture problematic messages
resource "aws_sqs_queue" "dead_letters_for_experiments" {
  name                       = "llm-dead-letter-queue"
  message_retention_seconds  = 1209600 # 14 days retention for DLQ
  visibility_timeout_seconds = 30      # visibility timeout can be adjusted
  fifo_queue                 = false   # set to true if using FIFO queue
}

# 'InvokeLambda' Lambda function to call AWS Bedrock

# SQS -> Lambda: Triggers 'InvokeModel' lambda (aka. 'app')
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.submit_experiments.arn
  function_name    = aws_lambda_function.invoke_model.arn
  enabled          = true
  batch_size       = 5
}


