output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.static_site.domain_name}"
}

output "cloudfront_distribution_arn" {
  value = aws_cloudfront_distribution.static_site.arn
}
