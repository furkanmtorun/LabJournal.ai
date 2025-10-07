"""API module via FastAPI."""
from datetime import datetime
import uuid
from fastapi import FastAPI, HTTPException, status
from botocore.exceptions import ClientError
from pydantic import BaseModel

import boto3
_VERSION: str = "0.1.0"
_TITLE: str = "LabJournal.AI - API"
_TABLE_NAME :str = "experiments"
_REGION_NAME: str = "eu-central-1"
_TIME_FORMAT: str = "%d.%m.%Y %H:%M:%S"
DB_CLIENT = boto3.client("dynamodb", region_name=_REGION_NAME)


# Models
class VersionModel(BaseModel):
    version: str
    
class HealthCheckModel(BaseModel):
    status: str


class ExperimentBaseModel(BaseModel):
    name: str
    category: str
    timestamp: str
    status: str

class ExperimentModel(ExperimentBaseModel):
    id: str
    result: str


app = FastAPI(
    title=_TITLE,
    description=_TITLE,
    version=_VERSION,
    docs_url="/docs",
)

@app.get("/", response_model=VersionModel)
def root_version() -> VersionModel:
    return VersionModel(**{"version": _VERSION})

@app.get("/health", response_model=HealthCheckModel, description="Health check")
def health_check() -> HealthCheckModel:
    """Health check."""
    response = DB_CLIENT.describe_table(TableName=_TABLE_NAME)["Table"]["TableStatus"]
    if response == "ACTIVE":
        return {"status": "OK"}
    else:
        return {"status": f"Error: {response}"}

@app.get("/experiments", response_model=list[ExperimentModel])
async def get_experiments() -> list[ExperimentModel]:
    """Returns all experiments."""
    response = DB_CLIENT.scan(TableName=_TABLE_NAME)["Items"]
    experiments_db: list[ExperimentModel] = []
    for item in response:
        experiment_data = {
            "id": item["id"]["S"],
            "name": item["name"]["S"],
            "category": item["category"]["S"],
            "timestamp": item["timestamp"]["S"],
            "status": item["status"]["S"],
            "result": item["result"]["S"],
        }
        experiments_db.append(ExperimentModel(**experiment_data))
    return experiments_db

@app.get("/experiments/{experiment_id}", response_model=ExperimentModel)
async def get_project(experiment_id: str) -> ExperimentModel:
    """Returns the project for the provided experiment ID."""
    response = DB_CLIENT.get_item(
        TableName=_TABLE_NAME,
        Key={
            "id": {"S": experiment_id}  # DynamoDB column is 'id'
        }
    )
    item = response.get("Item")
    if item:
        experiment_data = {
            "id": item["id"]["S"],
            "name": item["name"]["S"],
            "category": item["category"]["S"],
            "timestamp": item["timestamp"]["S"],
            "status": item["status"]["S"],
            "result": item["result"]["S"]
        }
        return ExperimentModel(**experiment_data)

    raise HTTPException(
        status_code=404,
        detail=f"Error: Experiment with the ID of {experiment_id} not found!"
    )
    
@app.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str):
    try:
        response = DB_CLIENT.delete_item(
            TableName=_TABLE_NAME,
            Key={
                'id': {'S': experiment_id}
            },
            ConditionExpression="attribute_exists(id)"  # Ensures item exists
        )
        return {"message": f"Experiment {experiment_id} deleted successfully."}
    except ClientError as e:
        if e.response['Error']['Code'] == "ConditionalCheckFailedException":
            raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} not found.")
        else:
            raise HTTPException(status_code=500, detail=str(e))
        
@app.post("/experiments", response_model=ExperimentModel,  status_code=status.HTTP_201_CREATED)
async def create_experiment(experiment: dict[str, str]) -> ExperimentModel:
    experiment_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime(_TIME_FORMAT)
    status = "Queued"
    
    item = {
        "id": {"S": experiment_id},
        "name": {"S": experiment.get("name")},
        "category": {"S": experiment.get("category")},
        "timestamp": {"S": timestamp},
        "status": {"S": status},
        "result": {"S": ""},  # default empty
    }
    
    try:
        DB_CLIENT.put_item(
            TableName=_TABLE_NAME,
            Item=item,
            ConditionExpression="attribute_not_exists(id)"  # prevent overwriting
        )
        return ExperimentModel(
            id=experiment_id,
            name=experiment.get("name"),
            category=experiment.get("category"),
            timestamp=timestamp,
            status=status,
            result=""
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))