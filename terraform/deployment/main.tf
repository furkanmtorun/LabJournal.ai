# 1. Website

## 1.1. Web S3 Bucket
module "web_s3" {
  source              = "../modules/web/s3"
  website_bucket_name = var.website_bucket_name
}

## 1.2. Web CDN
module "web_cloudfront" {
  source                = "../modules/web/cloudfront"
  s3_bucket_domain_name = module.web_s3.bucket_regional_domain_name
}

## 1.3. Web S3-CDN connector via policy
module "web_connector" {
  source                          = "../modules/web/connector"
  web_bucket_arn                  = module.web_s3.bucket_arn
  web_bucket_name                 = module.web_s3.bucket_name
  web_cloudfront_distribution_arn = module.web_cloudfront.cloudfront_distribution_arn
}


# 2. Database
module "database" {
  source = "../modules/database"
}

# 3. App
module "app" {
  source                   = "../modules/app"
  input_images_bucket_name = var.input_images_bucket_name
}

# 4. API
module "api" {
  source = "../modules/api"
}

# 5. OpenSearch for Semantic Search
module "opensearch" {
  source              = "./modules/opensearch"
  region              = var.region
  dynamodb_stream_arn = module.database.experiments_stream_arn
}

