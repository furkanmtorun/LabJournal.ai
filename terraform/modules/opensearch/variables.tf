variable "region" {
  type        = string
  description = "AWS region"
}

variable "domain_name" {
  type        = string
  default     = "experiments-semantic-search"
  description = "Name of the OpenSearch domain"
}

variable "dynamodb_stream_arn" {
  type        = string
  description = "The ARN of the stream from the database module"
}