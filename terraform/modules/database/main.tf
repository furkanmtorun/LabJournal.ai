resource "aws_dynamodb_table" "experiments" {
  name             = "experiments"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "id"
  
  # Enable Streaming for OpenSearch
  ## To catch what is deleted and to delete from OpenSearch Indexes, it is "NEW_AND_OLD_IMAGES".
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES" 

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery { enabled = true }

  tags = {
    Name = "dynamodb-table-for-experiments"
  }
}