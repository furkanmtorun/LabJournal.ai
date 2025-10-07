locals {
  lambda_name              = "fastapi-lambda"
  api_source_dir           = "${path.root}/../../api"
  build_dir                = "${path.module}/build"
  zip_path                 = "${path.module}/fastapi_lambda.zip"
  aws_lambda_web_layer_arn = "arn:aws:lambda:eu-central-1:753240598075:layer:AWSLambdaWebAdapterPython312:1"
}

# Build the Lambda package locally
resource "null_resource" "build_lambda" {
  triggers = {
    source_hash = filebase64sha256("${local.api_source_dir}/main.py")
    req_hash    = filebase64sha256("${local.api_source_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      rm -rf ${local.build_dir}
      mkdir -p ${local.build_dir}
      cp ${local.api_source_dir}/main.py ${local.build_dir}/
      python3.12 -m venv ${local.build_dir}/venv
      . ${local.build_dir}/venv/bin/activate
      pip install --upgrade pip
      pip install -r ${local.api_source_dir}/requirements.txt -t ${local.build_dir}
      rm -rf ${local.build_dir}/venv
    EOT
  }
}

# Zip the build directory
data "archive_file" "lambda_zip" {
  depends_on  = [null_resource.build_lambda]
  type        = "zip"
  source_dir  = local.build_dir
  output_path = local.zip_path
}

# IAM role
resource "aws_iam_role" "lambda_exec" {
  name = "lambda-role-fastapi"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Lambda function
resource "aws_lambda_function" "fastapi_lambda" {
  depends_on      = [data.archive_file.lambda_zip]
  function_name   = local.lambda_name
  filename        = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"
  handler         = "main.handler"
  timeout         = 30
  memory_size     = 512
  role            = aws_iam_role.lambda_exec.arn
  layers          = [local.aws_lambda_web_layer_arn]
  environment {
    variables = {
      AWS_LWA_ENABLE_APP_LOGS = "true"
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/bootstrap"
      PORT                    = "8000"
    }
  }
}


resource "aws_lambda_function_url" "url" {
  function_name      = aws_lambda_function.fastapi_lambda.function_name
  authorization_type = "NONE"
}

# Cleanup after zip creation
resource "null_resource" "cleanup_lambda_build" {
  depends_on = [data.archive_file.lambda_zip]

  provisioner "local-exec" {
    command = <<-EOT
      echo "Cleaning up build artifacts..."
      rm -rf ${local.build_dir}
      rm -f ${local.zip_path}
    EOT
  }
}