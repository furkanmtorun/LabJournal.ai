#!/bin/sh

# PATH=$PATH:$LAMBDA_TASK_ROOT/bin \
#     PYTHONPATH=$PYTHONPATH:/opt/python:$LAMBDA_RUNTIME_DIR \
#     exec python -m uvicorn --port=$PORT main:app

HOST=0.0.0.0
PORT=8000
AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap
exec uvicorn main:app --host $HOST --port $PORT
