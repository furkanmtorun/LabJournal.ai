resource "aws_dynamodb_table" "experiments" {
  name             = "experiments"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "id"
  
  # Enable Streaming for OpenSearch
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE" 

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery { enabled = true }

  tags = {
    Name = "dynamodb-table-for-experiments"
  }
}