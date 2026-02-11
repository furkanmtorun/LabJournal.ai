output "website_bucket_name" {
  description = "Name of the S3 bucket hosting the website"
  value       = module.web_s3.bucket_name
}

output "website_bucket_arn" {
  description = "ARN of the S3 bucket hosting the website"
  value       = module.web_s3.bucket_arn
}

output "website_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = module.web_s3.bucket_regional_domain_name
}

output "cloudfront_url" {
  description = "The CloudFront distribution URL for the website"
  value       = module.web_cloudfront.cloudfront_url
}

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = module.web_cloudfront.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = module.web_cloudfront.cloudfront_domain_name
}

output "lambda_function_url" {
  description = "The URL to API Lambda Func hosting FastApi."
  value       = module.api.lambda_function_url
}

output "queue_for_submit_experiments" {
  value = module.app.url_queue_for_submit_experiments
}

output "dlq_for_experiments" {
  value = module.app.url_dlq_for_experiments
}

output "opensearch_endpoint" {
  value = module.opensearch.opensearch_endpoint
}