locals {
  region          = "eu-central-1"
  collection_name = "semantic-search-collection"
}

data "aws_caller_identity" "current" {}

# --- 1. DynamoDB Main Table ---
resource "aws_dynamodb_table" "experiments" {
  name             = "experiments"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "id"
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"
  point_in_time_recovery { enabled = true } # Required for initial Zero-ETL export

  attribute { 
    name = "id" 
    type = "S" 
  }
}

# --- 2. IAM Role for Pipeline ---
resource "aws_iam_role" "pipeline_role" {
  name = "osis-pipeline-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "osis-pipelines.amazonaws.com" }
    }]
  })
}

# Add essential permissions to the role
resource "aws_iam_role_policy" "pipeline_perms" {
  role = aws_iam_role.pipeline_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:DescribeTable", "dynamodb:DescribeContinuousBackups", "dynamodb:ExportTableToPointInTime", "dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:DescribeStream", "dynamodb:ListStreams"]
        Resource = [aws_dynamodb_table.experiments.arn, "${aws_dynamodb_table.experiments.arn}/stream/*"]
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:ListBucket", "s3:DeleteObject"]
        Resource = [aws_s3_bucket.temp_ingestion.arn, "${aws_s3_bucket.temp_ingestion.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:${local.region}::foundation-model/amazon.titan-embed-text-v1"
      }
    ]
  })
}

# --- 3. OpenSearch Security Policies ---
resource "aws_opensearchserverless_security_policy" "encryption" {
  name = "${local.collection_name}-enc"
  type = "encryption"
  policy = jsonencode({
    Rules = [{ ResourceType = "collection", Resource = [local.collection_name] }]
    AWSOwnedKey = true
  })
}

resource "aws_opensearchserverless_security_policy" "network" {
  name = "${local.collection_name}-net"
  type = "network"
  policy = jsonencode([{
    Rules = [{ ResourceType = "collection", Resource = [local.collection_name] }, { ResourceType = "dashboard", Resource = [local.collection_name] }]
    AllowFromPublic = true
  }])
}

resource "aws_opensearchserverless_access_policy" "data_access" {
  name = "${local.collection_name}-access"
  type = "data"
  policy = jsonencode([{
    Rules = [
      { ResourceType = "collection", Resource = [local.collection_name], Permission = ["aoss:CreateCollectionItems", "aoss:DescribeCollectionItems"] },
      { ResourceType = "index", Resource = ["index/${local.collection_name}/*"], Permission = ["aoss:ReadDocument", "aoss:WriteDocument", "aoss:CreateIndex", "aoss:UpdateIndex"] }
    ],
    Principals = [data.aws_caller_identity.current.arn, aws_iam_role.pipeline_role.arn]
  }])
}

# --- 4. The Collection ---
resource "aws_opensearchserverless_collection" "vector_store" {
  name       = local.collection_name
  type       = "VECTORSEARCH"
  depends_on = [aws_opensearchserverless_security_policy.encryption]
}

# --- 5. Ingestion Pipeline ---
resource "aws_s3_bucket" "temp_ingestion" {
  bucket = "labjournalai-temp-vector-store-${data.aws_caller_identity.current.account_id}" # Added account ID for global uniqueness
}

resource "aws_osis_pipeline" "dynamodb_to_opensearch" {
  pipeline_name = "ddb-to-aoss-pipeline"
  min_units     = 1
  max_units     = 4

  pipeline_configuration_body = <<EOF
version: "2"
dynamodb-pipeline:
  source:
    dynamodb:
      tables:
        - table_arn: "${aws_dynamodb_table.experiments.arn}"
      export:
        s3_bucket: "${aws_s3_bucket.temp_ingestion.id}"
        s3_region: "${local.region}"
      stream:
        start_position: "LATEST"
  processor:
    - aws_bedrock_embeddings:
        model_id: "amazon.titan-embed-text-v1"
        input_content: "result"
        output_content: "result_vector"
        role_arn: "${aws_iam_role.pipeline_role.arn}"
  sink:
    - opensearch:
        hosts: [ "https://${aws_opensearchserverless_collection.vector_store.collection_endpoint}" ]
        index: "my_index"
        aws:
          region: "${local.region}"
          sts_role_arn: "${aws_iam_role.pipeline_role.arn}"
          serverless: true
EOF
}