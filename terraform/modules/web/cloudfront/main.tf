locals {
  origin_id = "labjournalai-s3-origin-id"
}

# OAC to ensure only CloudFront can access S3 content
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "s3-origin-access-control"
  description                       = "CloudFront OAC for static website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Cache policies
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}


resource "aws_cloudfront_distribution" "static_site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "CloudFront dist. for static website"

  origin {
    domain_name              = var.s3_bucket_domain_name
    origin_id                = local.origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
    s3_origin_config {
      origin_access_identity = "" # Required field but OAC handles this
    }
  }

  default_cache_behavior {
    target_origin_id       = local.origin_id
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  ordered_cache_behavior {
    path_pattern     = "*.html"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id
    compress         = true
    
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
    viewer_protocol_policy     = "redirect-to-https"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/error.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 403
    response_page_path = "/error.html"
  }

  viewer_certificate {
    cloudfront_default_certificate = true # Change this if using a custom domain
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations = [] # Here we can block certain countries.
    }
  }

  tags = {
    Name = "static-webapp-cdn"
  }
}
