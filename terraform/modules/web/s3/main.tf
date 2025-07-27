locals {
  website_files_path = "../../website/" # The relative path to the website files

  # To avoid the website downloads those file instead of rendering/displaying 
  # extension => MIME type
  website_content_types = {
    ".html" : "text/html",
    ".css" : "text/css",
    ".js" : "text/javascript",
    ".png" : "image/png",
    ".jpg" : "image/jpeg",
    ".jpeg" : "image/jpeg"
  }
}

# S3 Bucket
resource "aws_s3_bucket" "website" {
  bucket = var.website_bucket_name

  lifecycle {
    prevent_destroy = false # FIX
  }

  tags = {
    Name        = var.website_bucket_name
    Environment = "${terraform.workspace}"
  }
}

# Logging
resource "aws_s3_bucket_logging" "website_logging" {
  bucket        = aws_s3_bucket.website.id
  target_bucket = aws_s3_bucket.website.id
  target_prefix = "website_logs/"
}

# Versioning
resource "aws_s3_bucket_versioning" "website_versioning" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Files
resource "aws_s3_object" "website_files" {
  for_each = fileset(local.website_files_path, "**/*.{html,css,js,png,jpg,jpeg}")

  bucket = aws_s3_bucket.website.bucket
  key    = each.value
  source = "${local.website_files_path}/${each.value}"
  content_type = lookup(
    local.website_content_types,
    ".${element(split(".", each.value), length(split(".", each.value)) - 1)}",
    "application/octet-stream"
  )
}

# Block all public access to s3. Cloudfront will access via OAC.
resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
