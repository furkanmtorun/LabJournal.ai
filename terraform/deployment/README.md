# Terraform Deployment Documentation

This directory contains the Terraform configuration files for deploying infrastructure. Below is an overview of the folder structure and the purpose of each file and module.

## Folder Structure

```
terraform/
├── modules/
│   ├── web/
│   │   ├── s3/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── cloudfront/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
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
│   ├── provider.tf        # region & profile config, version pinned
│   ├── backend.tf         # shared backend with dynamic workspace key
│   ├── prod.tfvars        # env-specific values
│   ├── staging.tfvars     # env-specific values
│   └── README.md          # how to use this

```

### Usage

- Terraform workspace is going to take care of `providers.tf` to apply DRY principle.

```bash
cd terraform/deployment

terraform init  # only once to initialize backend
terraform workspace new prod      # if not already created
terraform workspace select prod
terraform apply -var-file=prod.tfvars

terraform workspace new staging   # if not already created
terraform workspace select staging
terraform apply -var-file=staging.tfvars

```