# LabJournal.ai

Alternative names: ILikeLab.ai, LabHere.ai

# Architecture

TBA!

# Setup

## TODO

- Implement App
- Implement SQS & Dead Letter
- Implement API Gateway
- Link all these implementations
- Handle `# FIX` places

## AWS & Terraform

- Install AWS CLI and set your `.aws/credentials` file.
- Follow [Terraform Deployment Readme](./terraform/deployment/README.md)

## Web app

  ```bash
  npm install --save-dev --save-exact prettier
  npx prettier --write "**/*.{html,css,js}"
  ```

## Rest API
```bash
# To install and run locally
cd api/
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
