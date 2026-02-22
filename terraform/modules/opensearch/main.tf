data "aws_caller_identity" "current" {}

# This automatically gets your current public IP
data "http" "my_public_ip" {
  url = "https://ipv4.icanhazip.com"
}

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
    Statement = [
      {
        # STATEMENT 1: Allow your Lambda (IAM based)
        Effect = "Allow"
        Principal = {
          AWS = "${aws_iam_role.sync_lambda_role.arn}"
        }
        Action   = "es:*"
        Resource = "arn:aws:es:${var.region_name}:${data.aws_caller_identity.current.account_id}:domain/experiments-semantic-search/*"
      },
      {
        # STATEMENT 2: Allow your Browser (IP based)
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = "es:*"
        Resource = "arn:aws:es:${var.region_name}:${data.aws_caller_identity.current.account_id}:domain/experiments-semantic-search/*"
        Condition = {
          IpAddress = {
            # Use the IP we automatically discovered, with /32 suffix
            "aws:SourceIp" = ["${chomp(data.http.my_public_ip.response_body)}/32"]
          }
        }
      }
    ]
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
      cd ${path.module}/dist && zip -r ../semantic_search.zip .
    EOT
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/dist"
  output_path = "${path.module}/semantic_search.zip"
  depends_on  = [null_resource.lambda_build]
}

# 4. The Sync Lambda Function
resource "aws_lambda_function" "sync_lambda" {
  filename      = "${path.module}/semantic_search.zip"
  function_name = "dynamodb-to-opensearch-sync"
  role          = aws_iam_role.sync_lambda_role.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  # Explicitly link the group (Provider version 5.x+)
  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.lambda_log_group.name
  }

  # Ensure the log group is created BEFORE the lambda is created
  depends_on = [aws_cloudwatch_log_group.lambda_log_group]

  environment {
    variables = {
      OS_ENDPOINT = aws_opensearch_domain.semantic_search.endpoint
      REGION      = var.region_name
    }
  }
}

# The Trigger: Connects the Stream from your "Database" module to this Lambda
resource "aws_lambda_event_source_mapping" "dynamodb_to_opensearch_trigger" {
  event_source_arn  = var.dynamodb_stream_arn
  function_name     = aws_lambda_function.sync_lambda.arn
  starting_position = "LATEST"
}

# CloudWatch
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/dynamodb-to-opensearch-sync"
  retention_in_days = 7
}

resource "aws_iam_role_policy" "lambda_logging_policy" {
  name = "lambda-logging-policy"
  role = aws_iam_role.sync_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}