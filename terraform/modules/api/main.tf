locals {
  aws_lambda_web_layer_arn = "arn:aws:lambda:eu-central-1:753240598075:layer:AWSLambdaWebAdapterPython312:1"
}

# Build and zip FastAPI code + dependencies before Lambda deployment
resource "null_resource" "build_fastapi_zip" {
  triggers = {
    main_hash        = filesha256("${path.module}/../api/main.py")
    requirements_hash = filesha256("${path.module}/../api/requirements.txt")
  }

  provisioner "local-exec" {
    command = <<EOT
      set -e
      cd ${path.module}/../api
      rm -rf ../build && mkdir ../build
      cp -r . ../build/
      cd ../build
      pip install -r requirements.txt -t .
      zip -r ../fastapi_lambda.zip . > /dev/null
      cd ${path.module}
    EOT
  }
}


resource "aws_lambda_function" "fastapi_lambda" {
  function_name    = "fastapi-lambda"
  filename         = "${path.module}/../fastapi_lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../fastapi_lambda.zip")
  runtime          = "python3.12"
  handler          = "api.main.handler"
  timeout          = 30
  memory_size      = 512
  role             = aws_iam_role.lambda_exec.arn
  layers           = [local.aws_lambda_web_layer_arn]

  environment {
    variables = {
      AWS_LWA_ENABLE_APP_LOGS = "true"
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/bootstrap"
      PORT                    = "8000"
    }
  }

  depends_on = [null_resource.build_fastapi_zip]
}


resource "aws_iam_role" "lambda_exec" {
  name = "lambda-role-fastapi"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fastapi_lambda.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_apigatewayv2_api" "api" {
  name          = "fastapi-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.fastapi_lambda.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}
