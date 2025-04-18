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
    ".jpeg": "image/jpeg"
  }
}

# S3 Bucket
resource "aws_s3_bucket" "website" {
  bucket = var.website_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = var.website_bucket_name
    Environment = "${terraform.workspace}"
  }
}

# Logging
resource "aws_s3_bucket_logging" "website_logging" {
  bucket = aws_s3_bucket.website.id
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
  bucket   = aws_s3_bucket.website.id
  for_each = fileset(path.module, "${local.website_files_path}**/*.{html,css,js,png,jpg,jpeg}")
  # Here, replace to avoid having the file path prefix in S3, we just need bucket/file.html structure.
  key          = replace(each.value, "/^${local.website_files_path}/", "")
  source       = each.value
  content_type = lookup(local.website_content_types, regex("\\.[^.]+$", each.value), "application/octet-stream")
  etag         = filemd5(each.value)
}

# Web configuration
resource "aws_s3_bucket_website_configuration" "website_hosting" {
  bucket = aws_s3_bucket.website.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "error.html"
  }
}

# Policy for public access block
resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy
resource "aws_s3_bucket_policy" "website_bucket_policy" {
  depends_on = [aws_s3_bucket_public_access_block.website]
  bucket     = aws_s3_bucket.website.id
  policy = jsonencode(
    {
      Version : "2012-10-17",
      Statement : [
        {
          Effect    = "Deny",
          Principal = "*",
          Action    = "s3:DeleteBucket",
          Resource  = aws_s3_bucket.website.arn
        },
        {
          Effect    = "Deny",
          Principal = "*",
          Action    = ["s3:DeleteObject", "s3:DeleteObjectVersion"],
          Resource  = "${aws_s3_bucket.website.arn}/*"
        },
        {
          Sid       = "MakeTheFilesPubliclyAvailable",
          Effect    = "Allow",
          Principal = "*",
          Action    = "s3:GetObject",
          Resource  = "${aws_s3_bucket.website.arn}/*"
        }
      ]
    }
  )
}
