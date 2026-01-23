data "aws_caller_identity" "current" {}

# 1. Managed (not serverless) OpenSearch Domain
resource "aws_opensearch_domain" "semantic_search" {
  domain_name    = "experiments-semantic-search"
  engine_version = "OpenSearch_3.3" # latest as of 23rd Jan '26.

  cluster_config {
    instance_type          = "t3.small.search"
    instance_count         = 1
    zone_awareness_enabled = false # turn "true" for high availability across zones
  } 

  ebs_options {
    ebs_enabled = true
    volume_size = 10
    volume_type = "gp3"
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "es:*"
      Principal = "*"
      Effect    = "Allow"
      Resource  = "arn:aws:es:${var.region}:*:domain/*/*"
    }]
  })
}

# 2. IAM Role for Sync Lambda
resource "aws_iam_role" "sync_lambda_role" {
  name = "search-sync-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Lambda Permissions: Read Stream, Call Bedrock, Write to OpenSearch
resource "aws_iam_role_policy" "lambda_policy" {
  role = aws_iam_role.sync_lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DescribeStream", "dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:ListStreams"]
        Resource = var.dynamodb_stream_arn
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:${var.region}::foundation-model/amazon.titan-embed-text-v1"
      },
      {
        Effect   = "Allow"
        Action   = ["es:ESHttpPost", "es:ESHttpPut", "es:ESHttpHead"]
        Resource = "${aws_opensearch_domain.semantic_search.arn}/*"
      }
    ]
  })
}

# 3. The Sync Lambda Function
resource "aws_lambda_function" "sync_lambda" {
  filename      = "sync_logic.zip" # You will need to provide this zip
  function_name = "ddb-to-opensearch-sync"
  role          = aws_iam_role.sync_lambda_role.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  environment {
    variables = {
      OS_ENDPOINT = aws_opensearch_domain.semantic_search.endpoint
      REGION      = var.region
    }
  }
}

# The Trigger: Connects the Stream from your "Database" module to this Lambda
resource "aws_lambda_event_source_mapping" "ddb_trigger" {
  event_source_arn  = var.dynamodb_stream_arn
  function_name     = aws_lambda_function.sync_lambda.arn
  starting_position = "LATEST"
}
