"""API module via FastAPI."""

import uuid
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel

_VERSION: str = "0.1.4dev"
_TITLE: str = "LabJournal.AI - API"
_TABLE_NAME: str = "experiments"
_REGION_NAME: str = "eu-central-1"
_TIME_FORMAT: str = "%d.%m.%Y %H:%M:%S"
DB_CLIENT = boto3.client("dynamodb", region_name=_REGION_NAME)
S3_BUCKET_NAME: str = "labjournalai-input-images-prod"
S3_CLIENT = boto3.client("s3", region_name=_REGION_NAME)

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


class ExperimentPatchRequest(BaseModel):
    status: str  # "Queued", "Completed" or "Failed"
    result: str
    error: str


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
        TableName=_TABLE_NAME, Key={"id": {"S": experiment_id}}  # DynamoDB column is 'id'
    )
    item = response.get("Item")
    if item:
        experiment_data = {
            "id": item["id"]["S"],
            "name": item["name"]["S"],
            "category": item["category"]["S"],
            "timestamp": item["timestamp"]["S"],
            "status": item["status"]["S"],
            "result": item["result"]["S"],
        }
        return ExperimentModel(**experiment_data)

    raise HTTPException(
        status_code=404, detail=f"Error: Experiment with the ID of {experiment_id} not found!"
    )


@app.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str):
    try:
        response = DB_CLIENT.delete_item(
            TableName=_TABLE_NAME,
            Key={"id": {"S": experiment_id}},
            ConditionExpression="attribute_exists(id)",  # Ensures item exists
        )
        return {"message": f"Experiment {experiment_id} deleted successfully."}
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(status_code=404, detail=f"Experiment {experiment_id} not found.")
        else:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/experiments", response_model=ExperimentModel, status_code=status.HTTP_201_CREATED)
async def create_experiment(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile = File(...)
) -> ExperimentModel:
    experiment_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime(_TIME_FORMAT)
    status = "Queued"
    
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images are allowed")
    
    try:
        S3_CLIENT.upload_fileobj(
            image.file, 
            S3_BUCKET_NAME, 
            experiment_id,
            ExtraArgs={"ContentType": image.content_type}
        )
        await image.close()
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")

    item = {
        "id": {"S": experiment_id},
        "name": {"S": name},
        "category": {"S": category},
        "timestamp": {"S": timestamp},
        "status": {"S": status},
        "result": {"S": ""},  
    }

    try:
        DB_CLIENT.put_item(
            TableName=_TABLE_NAME,
            Item=item,
            ConditionExpression="attribute_not_exists(id)",
        )
        return ExperimentModel(
            id=experiment_id,
            name=name,
            category=category,
            timestamp=timestamp,
            status=status,
            result="",
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))


# Patch func
def update_experiment(experiment_id: str, patch: ExperimentPatchRequest) -> None:
    # Build dynamic update expression for result/error + status
    update_parts = []
    expr_attr_names = {"#status": "status"}
    expr_attr_values = {
        ":new_status": {"S": patch.status},
        ":expected_status": {"S": "Queued"},
    }

    if patch.result is not None:
        update_parts.append("#result = :result")
        expr_attr_names["#result"] = "result"
        expr_attr_values[":result"] = {"S": patch.result}

    if patch.error is not None:
        update_parts.append("#error = :error")
        expr_attr_names["#error"] = "error"
        expr_attr_values[":error"] = {"S": patch.error[:1000]}

    if not update_parts:
        # At least status must change
        update_parts.append("#status = :new_status")
    else:
        update_parts.append("#status = :new_status")

    update_expression = "SET " + ", ".join(update_parts)

    DB_CLIENT.update_item(
        TableName=_TABLE_NAME,
        Key={"id": {"S": experiment_id}},
        UpdateExpression=update_expression,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values,
        ConditionExpression="#status = :expected_status",
        ReturnValues="NONE",
    )


@app.patch("/experiments/{experiment_id}", response_model=ExperimentModel)
async def patch_experiment(experiment_id: str, patch: ExperimentPatchRequest):
    if patch.status not in {"Completed", "Failed"}:
        raise HTTPException(
            status_code=400,
            detail="status must be either 'Completed' or 'Failed'.",
        )

    try:
        update_experiment(experiment_id, patch)
    except DB_CLIENT.exceptions.ConditionalCheckFailedException:
        # status was not Queued anymore
        raise HTTPException(
            status_code=409,
            detail=f"Experiment {experiment_id} is not in Queued state anymore.",
        )
    except Exception as e:
        # unexpected server-side error
        raise HTTPException(
            status_code=500,
            detail=f"Update failed: {e}",
        )

    # Reuse your existing get endpoint logic to return the updated item
    response = DB_CLIENT.get_item(
        TableName=_TABLE_NAME,
        Key={"id": {"S": experiment_id}},
    )
    item = response.get("Item")
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"Experiment with the ID of {experiment_id} not found!",
        )

    experiment_data = {
        "id": item["id"]["S"],
        "name": item["name"]["S"],
        "category": item["category"]["S"],
        "timestamp": item["timestamp"]["S"],
        "status": item["status"]["S"],
        "result": item.get("result", {}).get("S"),
    }
    return ExperimentModel(**experiment_data)
