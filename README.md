# LabJournal.ai

[![Auto formatting and linting](https://github.com/furkanmtorun/LabJournal.ai/actions/workflows/formatting_and_linting.yml/badge.svg)](https://github.com/furkanmtorun/LabJournal.ai/actions/workflows/formatting_and_linting.yml)

- Keep labs notebooks digital effortlessly!
- Alternative names: ILikeLab.ai, LabHere.ai

# Architecture

![Architecture](architecture.png)

# Setup

### 1. AWS & Terraform

- Install AWS CLI and set the `.aws/credentials` file.
- Follow [Terraform Deployment Readme](./terraform/deployment/README.md)

### 2. Web app

```bash
npm install --save-dev --save-exact prettier
npx prettier --write "**/*.{html,css,js}"
open index.html
```

### 3. (REST) API

```bash
# To install and run locally
cd api/
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
