locals {
  website_bucket_name = "labjournalai-website"
  website_files_path = "../../website/" # The relative path to the website files

  # To avoid the website downloads those file instead of rendering/displaying | extension => MIME type
  website_content_types = {
    ".html" : "text/html",
    ".css" : "text/css",
    ".js" : "text/javascript"
    ".png" : "image/png"
  }
}


resource "aws_s3_bucket" "website" {
  bucket = local.website_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "labjournalai-website"
    Environment = "${terraform.workspace}"
  }
}

# Website files
resource "aws_s3_object" "website_files" {
  bucket   = aws_s3_bucket.website.id
  for_each = fileset(path.module, "${local.website_files_path}/**/*.{html,css,js,png}")
  # Here, replace to avoid having the file path prefix in S3, we just need bucket/file.html structure.
  key          = replace(each.value, "/^${local.website_files_path}/", "")
  source       = each.value
  content_type = lookup(local.website_content_types, regex("\\.[^.]+$", each.value), null)
  etag         = filemd5(each.value)
}

# Policy for static website hosted on s3
resource "aws_s3_bucket_public_access_block" "public_access_block" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Allow public access to files in website bucket for hosting
resource "aws_s3_bucket_policy" "website_bucket_policy" {
  depends_on = [aws_s3_bucket_public_access_block.public_access_block]
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

resource "aws_s3_bucket_website_configuration" "website_hosting" {
  bucket = aws_s3_bucket.website.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "error.html"
  }
}