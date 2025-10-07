locals {
  api_src_dir   = "${path.module}/../../../api"
  build_dir     = "${path.module}/../../../build"
  zip_file_path = "${local.build_dir}/fastapi_lambda.zip"

  aws_lambda_web_layer_arn = "arn:aws:lambda:eu-central-1:753240598075:layer:AWSLambdaWebAdapterPython312:1"
}

resource "null_resource" "build_fastapi_zip" {
  triggers = {
    main_hash         = filesha256("${local.api_src_dir}/main.py")
    requirements_hash = filesha256("${local.api_src_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    command = <<EOT
      set -e
      rm -rf ${local.build_dir} && mkdir -p ${local.build_dir}
      cp -r ${local.api_src_dir}/* ${local.build_dir}/
      cd ${local.build_dir}
      pip install -r requirements.txt -t .
      zip -r ${local.zip_file_path} . > /dev/null
    EOT
  }
}

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

resource "aws_lambda_function" "fastapi_lambda" {
  function_name    = "fastapi-lambda"
  filename         = local.zip_file_path
  source_code_hash = filebase64sha256(local.zip_file_path)
  runtime          = "python3.12"
  handler          = "main.handler"
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

resource "aws_lambda_function_url" "url" {
  function_name      = aws_lambda_function.fastapi_lambda.function_name
  authorization_type = "NONE"
}

