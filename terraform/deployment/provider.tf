terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.95.0"
    }
  }

  # Must be hard-coded
  backend "s3" {
    bucket       = "labjournalai-terraform-bucket"
    region       = "eu-central-1"
    key          = "deployment.tfstate"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region
}
