#!/bin/sh

export PATH=$PATH:$LAMBDA_TASK_ROOT/bin
export PYTHONPATH=$LAMBDA_TASK_ROOT:$PYTHONPATH

HOST=0.0.0.0
PORT=8000

exec uvicorn main:app --host $HOST --port $PORT
