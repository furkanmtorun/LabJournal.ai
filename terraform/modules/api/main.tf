locals {
  lambda_name              = "fastapi-lambda"
  api_source_dir           = "${path.root}/../../api"
  build_dir                = "${path.module}/build"
  zip_path                 = "${path.module}/fastapi_lambda.zip"
  aws_lambda_web_layer_arn = "arn:aws:lambda:eu-central-1:753240598075:layer:LambdaAdapterLayerX86:25"
}

# Step 1: Build the Lambda package
resource "null_resource" "build_lambda" {
  triggers = {
    main_hash = filesha256("${local.api_source_dir}/main.py")
    req_hash  = filesha256("${local.api_source_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      echo "Creating build directory..."
      rm -rf ${local.build_dir}
      mkdir -p ${local.build_dir}

      echo "Copying main.py..."
      cp ${local.api_source_dir}/main.py ${local.build_dir}/

      echo "Installing dependencies with Python 3.12..."
      python3.12 -m venv ${local.build_dir}/venv
      . ${local.build_dir}/venv/bin/activate
      pip install --upgrade pip
      pip install -r ${local.api_source_dir}/requirements.txt -t ${local.build_dir}

      echo "Removing temporary virtual environment..."
      rm -rf ${local.build_dir}/venv
    EOT
  }
}

# Step 2: Archive the build directory
data "archive_file" "lambda_zip" {
  depends_on  = [null_resource.build_lambda]
  type        = "zip"
  source_dir  = local.build_dir
  output_path = local.zip_path
}

# Step 3: IAM role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "lambda-role-fastapi"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Step 4: Attach policy to access Lambda Layer
resource "aws_iam_policy" "lambda_layer_access" {
  name        = "AllowLambdaGetLayerVersion"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:GetLayerVersion"]
        Resource = local.aws_lambda_web_layer_arn
      }
    ]
  })
}

resource "aws_iam_policy_attachment" "attach_layer_access" {
  name       = "AttachLambdaLayerAccess"
  policy_arn = aws_iam_policy.lambda_layer_access.arn
  roles      = [aws_iam_role.lambda_exec.name]
}

# Step 5: Lambda Function
resource "aws_lambda_function" "fastapi_lambda" {
  depends_on       = [data.archive_file.lambda_zip]
  function_name    = local.lambda_name
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  handler          = "main.handler"
  memory_size      = 512
  timeout          = 30
  role             = aws_iam_role.lambda_exec.arn
  layers           = [local.aws_lambda_web_layer_arn]

  environment {
    variables = {
      AWS_LWA_ENABLE_APP_LOGS = "true"
      AWS_LAMBDA_EXEC_WRAPPER = "/opt/bootstrap"
      PORT                    = "8000"
    }
  }
}

# Step 6: Lambda Function URL
resource "aws_lambda_function_url" "lambda_url" {
  function_name      = aws_lambda_function.fastapi_lambda.function_name
  authorization_type = "NONE"
}

# Step 7: Cleanup build folder after deployment
resource "null_resource" "cleanup_build" {
  depends_on = [aws_lambda_function.fastapi_lambda]

  provisioner "local-exec" {
    command = <<-EOT
      echo "Cleaning up build folder..."
      rm -rf ${local.build_dir}
      # rm -f ${local.zip_path} # optional: remove zip if you don't want to keep
    EOT
  }
}
