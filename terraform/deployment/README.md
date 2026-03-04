# Terraform Deployment Documentation

This directory contains the Terraform configuration files for deploying infrastructure. Below is an overview of the folder structure and the purpose of each file and module.

## 0. Folder Structure

```
terraform/
├── modules/
│   ├── web/
│   │   ├── s3/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── cloudfront/
│   │       ├── ...
│   ├── api/
│   │   └── ...
│   └── app/
│       └── ...
├── deployment/
│   ├── main.tf            # imports and connects modules
│   ├── variables.tf       # shared input variables
│   ├── outputs.tf         # outputs for debugging or chaining
│   ├── provider.tf        # region & profile config, version pinned and shared backend with dynamic workspace key
│   ├── prod.tfvars        # env-specific values
│   ├── staging.tfvars     # env-specific values
│   └── README.md          # how to use this

```

## 1. Terraform backend prep.

```bash
aws --version
export REGION="eu-central-1"
export BUCKET_NAME="labjournalai-terraform-bucket"
aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION --create-bucket-configuration LocationConstraint=$REGION
```

## 2. Deploy

- Terraform workspace is going to take care of `providers.tf` to apply DRY principle.

```bash
cd terraform/deployment
export ENV="PROD" # "staging"
terraform init
terraform workspace new $ENV
terraform workspace list
terraform workspace select $ENV
terraform workspace show
terraform plan --var-file=$ENV.tfvars
terraform apply -var-file=$ENV.tfvars

# Destroy
terraform destroy -var-file=$ENV.tfvars
cloud-nuke aws --region eu-central-1
```

## 3. FAQ

**If the website on Cloudfront seems outdated, introduce "Invalidations" with a path:**

```bash
aws cloudfront create-invalidation --distribution-id "E3FLXN8W9LS922" --paths "/*"
```

**If the AWS Bedrock throws error due to quota, [create a Quote/Limit Increase Ticket](https://us-east-1.console.aws.amazon.com/servicequotas/home/services/bedrock/quotas):**

```
* Cross-region model inference tokens per minute for Amazon Nova Pro
* Cross-region model inference requests per minute for Amazon Nova Pro
```


**If the counts of items in DynamoDB and OpenSearch Index are different, cleanup via Dev Tools in OpenSearch Dashboard on AWS.**

```
POST /experiments_index/_delete_by_query
{
  "query": {
    "bool": {
      "must_not": [
        {
          "ids": {
            "values": ["ID_1", "ID_2", "ID_3", "ID_4", "ID_5", "ID_6"]
          }
        }
      ]
    }
  }
}
```
