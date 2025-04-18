variable "aws_region" {
  description = "AWS region"
  default     = "eu-central-1"
}

########## Module related variables ##########

# Website
variable "website_bucket_name" {
  type = string
}