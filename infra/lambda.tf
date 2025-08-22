# ---------- Lambda Functions ----------

# API Lambda Function (FastAPI)
resource "aws_lambda_function" "api" {
  function_name = "${var.project}-api"
  role          = aws_iam_role.api_lambda.arn

  # Container image configuration for FastAPI
  package_type = "Image"
  image_uri    = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project}-api:latest"

  # Performance configuration
  memory_size = 512
  timeout     = 30

  # Environment variables
  environment {
    variables = {
      DYNAMODB_SCHEDULES_TABLE = aws_dynamodb_table.schedules.name
      DYNAMODB_CAPTURES_TABLE  = aws_dynamodb_table.captures.name
      S3_ARTIFACTS_BUCKET      = aws_s3_bucket.artifacts.bucket
      KMS_ARTIFACTS_KEY_ARN    = aws_kms_key.artifacts.arn
      KMS_DYNAMODB_KEY_ARN     = aws_kms_key.dynamodb.arn
      COGNITO_USER_POOL_ID     = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID        = aws_cognito_user_pool_client.api_client.id
      SQS_JOBS_QUEUE_URL       = aws_sqs_queue.jobs.url
      CLOUDTRAIL_BUCKET        = aws_s3_bucket.trail.bucket
    }
  }

  # VPC configuration if needed for private subnets
  # vpc_config {
  #   subnet_ids         = var.private_subnet_ids
  #   security_group_ids = [aws_security_group.lambda.id]
  # }

  # Dead letter queue configuration
  dead_letter_config {
    target_arn = aws_sqs_queue.api_dlq.arn
  }

  tags = {
    Name = "${var.project}-api-lambda"
  }

  depends_on = [
    aws_iam_role_policy.api_lambda_logs,
    aws_cloudwatch_log_group.api_lambda,
  ]
}

# Capture Lambda Function (Playwright + Chromium)
resource "aws_lambda_function" "capture" {
  function_name = "${var.project}-capture"
  role          = aws_iam_role.capture_lambda.arn

  # Container image configuration for Playwright
  package_type = "Image"
  image_uri    = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project}-capture:latest"

  # High memory and timeout for browser operations
  memory_size = 2048
  timeout     = 60

  # Environment variables
  environment {
    variables = {
      DYNAMODB_SCHEDULES_TABLE = aws_dynamodb_table.schedules.name
      DYNAMODB_CAPTURES_TABLE  = aws_dynamodb_table.captures.name
      S3_ARTIFACTS_BUCKET      = aws_s3_bucket.artifacts.bucket
      KMS_ARTIFACTS_KEY_ARN    = aws_kms_key.artifacts.arn
      KMS_DYNAMODB_KEY_ARN     = aws_kms_key.dynamodb.arn
      SQS_JOBS_QUEUE_URL       = aws_sqs_queue.jobs.url
      SQS_DLQ_URL              = aws_sqs_queue.jobs_dlq.url
      # Browser configuration
      BROWSER_EXECUTABLE_PATH  = "/usr/bin/chromium-browser"
      PLAYWRIGHT_BROWSERS_PATH = "/tmp"
    }
  }

  # Ephemeral storage for browser cache and artifacts
  ephemeral_storage {
    size = 1024 # 1GB for temporary browser files
  }

  # Dead letter queue configuration
  dead_letter_config {
    target_arn = aws_sqs_queue.jobs_dlq.arn
  }

  tags = {
    Name = "${var.project}-capture-lambda"
  }

  depends_on = [
    aws_iam_role_policy.capture_lambda_logs,
    aws_cloudwatch_log_group.capture_lambda,
  ]
}

# Scheduler Lambda Function
resource "aws_lambda_function" "scheduler" {
  function_name = "${var.project}-scheduler"
  role          = aws_iam_role.scheduler_lambda.arn

  # Use ZIP package for lightweight scheduler
  filename         = "scheduler_placeholder.zip"
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  source_code_hash = data.archive_file.scheduler_placeholder.output_base64sha256

  # Lightweight configuration
  memory_size = 256
  timeout     = 60

  # Environment variables
  environment {
    variables = {
      DYNAMODB_SCHEDULES_TABLE = aws_dynamodb_table.schedules.name
      SQS_JOBS_QUEUE_URL       = aws_sqs_queue.jobs.url
      KMS_DYNAMODB_KEY_ARN     = aws_kms_key.dynamodb.arn
    }
  }

  # Dead letter queue configuration
  dead_letter_config {
    target_arn = aws_sqs_queue.scheduler_dlq.arn
  }

  tags = {
    Name = "${var.project}-scheduler-lambda"
  }

  depends_on = [
    aws_iam_role_policy.scheduler_lambda_logs,
    aws_cloudwatch_log_group.scheduler_lambda,
  ]
}

# ---------- SQS Event Source Mapping for Capture Lambda ----------

resource "aws_lambda_event_source_mapping" "capture_sqs" {
  event_source_arn = aws_sqs_queue.jobs.arn
  function_name    = aws_lambda_function.capture.arn
  batch_size       = 1 # Process one capture at a time for reliability

  # Error handling
  maximum_batching_window_in_seconds = 5

  # Only process when function is ready
  function_response_types = ["ReportBatchItemFailures"]
}

# ---------- EventBridge Target for Scheduler Lambda ----------

resource "aws_cloudwatch_event_target" "scheduler_lambda" {
  rule      = aws_cloudwatch_event_rule.scheduler.name
  target_id = "SchedulerLambdaTarget"
  arn       = aws_lambda_function.scheduler.arn

  dead_letter_config {
    arn = aws_sqs_queue.scheduler_dlq.arn
  }
}

# Lambda permission for EventBridge to invoke scheduler
resource "aws_lambda_permission" "scheduler_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduler.arn
}

# ---------- CloudWatch Log Groups ----------

resource "aws_cloudwatch_log_group" "api_lambda" {
  name              = "/aws/lambda/${var.project}-api"
  retention_in_days = 14

  tags = {
    Name = "${var.project}-api-lambda-logs"
  }
}

resource "aws_cloudwatch_log_group" "capture_lambda" {
  name              = "/aws/lambda/${var.project}-capture"
  retention_in_days = 14

  tags = {
    Name = "${var.project}-capture-lambda-logs"
  }
}

resource "aws_cloudwatch_log_group" "scheduler_lambda" {
  name              = "/aws/lambda/${var.project}-scheduler"
  retention_in_days = 14

  tags = {
    Name = "${var.project}-scheduler-lambda-logs"
  }
}

# ---------- Additional SQS Queues for Lambda Functions ----------

# API Lambda DLQ
resource "aws_sqs_queue" "api_dlq" {
  name                      = "${var.project}-api-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.project}-api-dlq"
  }
}

# Scheduler Lambda DLQ
resource "aws_sqs_queue" "scheduler_dlq" {
  name                      = "${var.project}-scheduler-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.project}-scheduler-dlq"
  }
}

# ---------- Placeholder Scheduler Code ----------

# Create a placeholder ZIP file for the scheduler Lambda
data "archive_file" "scheduler_placeholder" {
  type        = "zip"
  output_path = "scheduler_placeholder.zip"

  source {
    content  = <<EOF
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Placeholder scheduler function.
    This should be replaced with actual scheduling logic.
    """
    print(f"Scheduler triggered at {datetime.utcnow().isoformat()}")
    
    # TODO: Query DynamoDB for active schedules
    # TODO: Check which schedules are due for execution
    # TODO: Send messages to SQS for due captures
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Scheduler executed successfully',
            'timestamp': datetime.utcnow().isoformat()
        })
    }
EOF
    filename = "lambda_function.py"
  }
}

# ---------- IAM Role for Scheduler Lambda ----------

resource "aws_iam_role" "scheduler_lambda" {
  name               = "${var.project}-scheduler-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# CloudWatch Logs permissions for Scheduler Lambda
data "aws_iam_policy_document" "scheduler_lambda_logs" {
  statement {
    sid    = "AllowLogging"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project}-scheduler*"
    ]
  }
}

resource "aws_iam_role_policy" "scheduler_lambda_logs" {
  name   = "${var.project}-scheduler-lambda-logs"
  role   = aws_iam_role.scheduler_lambda.id
  policy = data.aws_iam_policy_document.scheduler_lambda_logs.json
}

# DynamoDB permissions for Scheduler Lambda
data "aws_iam_policy_document" "scheduler_lambda_dynamodb" {
  statement {
    sid    = "AllowDynamoDBRead"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem"
    ]
    resources = [
      aws_dynamodb_table.schedules.arn,
      "${aws_dynamodb_table.schedules.arn}/index/*"
    ]
  }
}

resource "aws_iam_role_policy" "scheduler_lambda_dynamodb" {
  name   = "${var.project}-scheduler-lambda-dynamodb"
  role   = aws_iam_role.scheduler_lambda.id
  policy = data.aws_iam_policy_document.scheduler_lambda_dynamodb.json
}

# SQS permissions for Scheduler Lambda
data "aws_iam_policy_document" "scheduler_lambda_sqs" {
  statement {
    sid    = "AllowSQSSendMessage"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [
      aws_sqs_queue.jobs.arn
    ]
  }
}

resource "aws_iam_role_policy" "scheduler_lambda_sqs" {
  name   = "${var.project}-scheduler-lambda-sqs"
  role   = aws_iam_role.scheduler_lambda.id
  policy = data.aws_iam_policy_document.scheduler_lambda_sqs.json
}

# KMS permissions for Scheduler Lambda
data "aws_iam_policy_document" "scheduler_lambda_kms" {
  statement {
    sid    = "AllowKMSDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey"
    ]
    resources = [
      aws_kms_key.dynamodb.arn
    ]
  }
}

resource "aws_iam_role_policy" "scheduler_lambda_kms" {
  name   = "${var.project}-scheduler-lambda-kms"
  role   = aws_iam_role.scheduler_lambda.id
  policy = data.aws_iam_policy_document.scheduler_lambda_kms.json
}