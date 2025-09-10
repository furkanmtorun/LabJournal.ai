"""API module via FastAPI."""
from fastapi import FastAPI
from pydantic import BaseModel

_VERSION: str = "0.1.0"
_TITLE: str = "LabJournal.AI - API"

# Models
class VersionModel(BaseModel):
    version: str
    
class HealthCheckModel(BaseModel):
    status: str


class ExperimentBaseModel(BaseModel):
    name: str
    category: str
    image: str
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
    return HealthCheckModel(status="OK")
