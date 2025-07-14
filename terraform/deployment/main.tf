# 1. Website

## 1.1 Web S3 Bucket
module "web_s3" {
  source              = "../modules/web/s3"
  website_bucket_name = var.website_bucket_name
}

## 1.2 Web CDN
module "web_cloudfront" {
  source                = "../modules/web/cloudfront"
  s3_bucket_domain_name = module.web_s3.bucket_regional_domain_name
  website_bucket_name   = module.web_s3.bucket_regional_domain_name # For CloudFront logs
}

## 1.3 Web Policy (to avoid circular dependency)
data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.web_s3.bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [module.web_cloudfront.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "s3_policy" {
  bucket = module.web_s3.bucket_name
  policy = data.aws_iam_policy_document.s3_policy.json
}
