data "aws_caller_identity" "current" {}

# 1. Managed (not serverless) OpenSearch Domain
resource "aws_opensearch_domain" "semantic_search" {
  domain_name    = "experiments-semantic-search"
  engine_version = "OpenSearch_3.3" # latest as of 23rd Jan '26.

  cluster_config {
    instance_type          = "t3.small.search" # change this for optimized utilization
    instance_count         = 1
    zone_awareness_enabled = false # turn "true" for high availability across zones
  } 

  ebs_options {
    ebs_enabled = true
    volume_size = 10 # free tier -> can be 100
    volume_type = "gp3"
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = "${aws_iam_role.sync_lambda_role.arn}"
      }
      Action   = "es:*"
      Resource = "arn:aws:es:${var.region_name}:${data.aws_caller_identity.current.account_id}:domain/experiments-semantic-search/*"
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
        Resource = "arn:aws:bedrock:${var.region_name}::foundation-model/amazon.titan-embed-text-v1"
      },
      {
        Effect   = "Allow"
        Action   = ["es:ESHttpPost", "es:ESHttpPut", "es:ESHttpHead"]
        Resource = "${aws_opensearch_domain.semantic_search.arn}/*"
      }
    ]
  })
}

# 3. Lambda app
resource "null_resource" "lambda_build" {
  # This triggers a rebuild only if your code or requirements change
  triggers = {
    code_hash         = filemd5("${path.module}/index.py")
    requirements_hash = filemd5("${path.module}/requirements.txt")
  }

  provisioner "local-exec" {
    # This command creates a clean 'dist' folder, installs deps, and zips everything
    command = <<EOT
      rm -rf ${path.module}/dist
      mkdir -p ${path.module}/dist
      cp ${path.module}/index.py ${path.module}/dist/
      pip install -r ${path.module}/requirements.txt -t ${path.module}/dist/
      cd ${path.module}/dist && zip -r ../opensearch.zip .
    EOT
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/dist"
  output_path = "${path.module}/opensearch.zip"
  depends_on  = [null_resource.lambda_build]
}

# 4. The Sync Lambda Function
resource "aws_lambda_function" "sync_lambda" {
  filename      = "opensearch.zip"
  function_name = "ddb-to-opensearch-sync"
  role          = aws_iam_role.sync_lambda_role.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  environment {
    variables = {
      OS_ENDPOINT = aws_opensearch_domain.semantic_search.endpoint
      REGION      = var.region_name
    }
  }
}

# The Trigger: Connects the Stream from your "Database" module to this Lambda
resource "aws_lambda_event_source_mapping" "ddb_trigger" {
  event_source_arn  = var.dynamodb_stream_arn
  function_name     = aws_lambda_function.sync_lambda.arn
  starting_position = "LATEST"
}
