<div>
  <h1 align="center">LabJournal.ai</h1>
  <p align="center">
   <strong>Keep labs notebooks digital effortlessly!</strong>
   <br>
    An end-to-end serverless platform that digitizes handwritten lab notebooks using vision-text LLM and enables semantic search.
  </p>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS">
  <img src="https://img.shields.io/badge/terraform-%235835CC.svg?style=for-the-badge&logo=terraform&logoColor=white" alt="Terraform">
  <img src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</div>


<p align="center">
  <a href="https://github.com/furkanmtorun/LabJournal.ai/actions/workflows/formatting_and_linting.yml">
    <img src="https://github.com/furkanmtorun/LabJournal.ai/actions/workflows/formatting_and_linting.yml/badge.svg" alt="Auto formatting and linting">
  </a>
</p>


---

## 🧪 Demo
TBA!

<br>


## 🏗️ Architecture
![Architecture](./assets/architecture.png)

| Category | Technology | Engineering Implementation |
| :--- | :--- | :--- |
| **Infra as Code** | **Terraform** | Modular HCL managing AWS Services and event-driven triggers. |
| **Compute** | **AWS Lambda** | High-performance ETL packaged via **Docker** for environment parity. |
| **Data Flow** | **SQS + DLQ** | Async. message queuing with Dead Letter Queues to prevent data loss. |
| **Intelligence** | **AWS Bedrock** | Generative AI for handwriting OCR and semantic embeddings. |
| **Persistence** | **DynamoDB** | Optimized NoSQL storage for experiment metadata. |
| **API Layer** | **FastAPI** | Python 3.12 backend with strict Pydantic type-hinting and validation. |
| **Interface** | **JS / jQuery** | Easy, lightweight front-end with **Materialize CSS**.
<br>

> **💡 Professional Workflow Note:** I utilized Github CoPilot as a force multiplier for non-critical boilerplate such as CSS layouts, UI/UX improvement, tests, etc. to focus 90% of my development efforts on actual work itself.

---

<br>

## 🚀 Deployment & Usage

### **1. Provision Infrastructure**

- Install Terraform, AWS CLI and set the `.aws/credentials`.
- Provision Terraform | see [Terraform Deployment Readme](./terraform/deployment/README.md) for the details.
```bash
  export ENV="PROD" # "staging"
  terraform apply --var-file=$ENV.tfvars
```


### **2. Local API Development**
Ensure you have Python 3.10+ installed and AWS credentials configured.
```bash
# Setup environment
cd api/
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Launch with Uvicorn
uvicorn main:app --reload --port 8000
```

### **3. Frontend Access**
The frontend is made up by static web pages. Simply serve in any modern browser:
```bash
cd website && python3 -m http.server 8000
```
