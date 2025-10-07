########## Global variables ##########

variable "aws_region" {
  description = "AWS region"
  default     = "eu-central-1"
}

########## Module related variables ##########

# Website
variable "website_bucket_name" {
  type = string
}

# S3 for input images
variable "input_images_bucket_name" {
  type = string
}