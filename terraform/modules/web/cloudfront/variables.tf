variable "s3_bucket_domain_name" {
  description = "The regional domain name of the S3 bucket for the website origin"
  type        = string
}

variable "website_bucket_name" {
  description = "The S3 bucket name where CloudFront will store its logs"
  type        = string
}
