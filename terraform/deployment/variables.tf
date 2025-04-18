variable "aws_region" {
  description = "AWS region"
  default     = "eu-central-1"
}

variable "s3_bucket_name_for_state_backend" {
  description = "Name of the S3 bucket"
  default = "labjournalai-terraform-state"
}

variable "dynamodb_table_for_state_lock" {
  description = "Name of the dynamodb table"
  default = "labjournalai-terraform-locks-table"
}