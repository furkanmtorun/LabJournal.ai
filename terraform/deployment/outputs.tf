output "web_s3_bucket_name" {
  value = module.website.website_bucket_name
}

output "web_s3_bucket_arn" {
  value = module.website.website_s3_endpoint
}