#!/bin/sh
HOST=0.0.0.0
PORT=8000
AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap
exec uvicorn main:app --host $HOST --port $PORT
