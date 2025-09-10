# Note: We do not have to define all attributes (columns) while creating, we can add on-the-fly.

resource "aws_dynamodb_table" "experiments" {
  name         = "experiments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "name"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "NameIndex"
    hash_key        = "name"
    projection_type = "ALL" # all attributes from the table are projected into the index
  }

  global_secondary_index {
    name            = "CategoryIndex"
    hash_key        = "category"
    projection_type = "ALL" # all attributes from the table are projected into the index
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    projection_type = "ALL" # all attributes from the table are projected into the index
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = false
    # false -> use AWS Owned CMK | only free option
    # true -> use AWS Managed CMK
    # true + key arn -> use custom key
  }

  tags = {
    Name        = "dynamodb-table-for-experiments"
  }
}