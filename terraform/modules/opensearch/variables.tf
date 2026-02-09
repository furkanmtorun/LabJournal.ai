variable "region_name" {
  type        = string
  description = "AWS region"
}

variable "dynamodb_stream_arn" {
  type        = string
  description = "The ARN of the stream from the database module"
}