terraform {
  backend "s3" {
    bucket         = var.s3_bucket_name_for_state_backend
    region         = var.aws_region
    key            = "${terraform.workspace}/terraform.tfstate"
    dynamodb_table = var.dynamodb_table_for_state_lock
    encrypt        = true
  }
}