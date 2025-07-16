# Web Policy (to avoid circular dependency)
data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${var.web_bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [var.web_cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "s3_policy" {
  bucket = var.web_bucket_name
  policy = data.aws_iam_policy_document.s3_policy.json
}
