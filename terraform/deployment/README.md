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
│   ├── app/
│   │   └── ...
│   └── common/
│       ├── vpc/
│       ├── iam/
│       └── security_groups/
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
cloud-nuke aws --region $REGION
```
