# Website
module "website" {
  source              = "../modules/web/s3"
  website_bucket_name = var.website_bucket_name
}