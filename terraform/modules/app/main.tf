# S3 Bucket to store input images
resource "aws_s3_bucket" "input_images" {
  bucket = var.input_images_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = var.input_images_bucket_name
    Environment = "${terraform.workspace}"
  }
}