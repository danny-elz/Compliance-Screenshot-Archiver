# ---------- IAM Roles for Lambda Functions ----------

# Basic Lambda execution role for common permissions
data "aws_iam_policy_document" "lambda_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_basic" {
  name               = "${var.project}-lambda-basic-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# Attach the basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_basic.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ---------- API Lambda Role (FastAPI) ----------

resource "aws_iam_role" "api_lambda" {
  name               = "${var.project}-api-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# CloudWatch Logs permissions for API Lambda
data "aws_iam_policy_document" "api_lambda_logs" {
  statement {
    sid    = "AllowLogging"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project}-api*"
    ]
  }
}

resource "aws_iam_role_policy" "api_lambda_logs" {
  name   = "${var.project}-api-lambda-logs"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.api_lambda_logs.json
}

# DynamoDB permissions for API Lambda (schedules and captures tables)
data "aws_iam_policy_document" "api_lambda_dynamodb" {
  statement {
    sid    = "AllowDynamoDBOperations"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
    resources = [
      aws_dynamodb_table.schedules.arn,
      "${aws_dynamodb_table.schedules.arn}/index/*",
      aws_dynamodb_table.captures.arn,
      "${aws_dynamodb_table.captures.arn}/index/*"
    ]
  }
}

resource "aws_iam_role_policy" "api_lambda_dynamodb" {
  name   = "${var.project}-api-lambda-dynamodb"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.api_lambda_dynamodb.json
}

# S3 permissions for API Lambda (read artifacts for verification and presigned URLs)
data "aws_iam_policy_document" "api_lambda_s3" {
  statement {
    sid    = "AllowS3ReadOperations"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion"
    ]
    resources = [
      "${aws_s3_bucket.artifacts.arn}/*"
    ]
  }

  statement {
    sid    = "AllowS3BucketOperations"
    effect = "Allow"
    actions = [
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.artifacts.arn
    ]
  }
}

resource "aws_iam_role_policy" "api_lambda_s3" {
  name   = "${var.project}-api-lambda-s3"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.api_lambda_s3.json
}

# KMS permissions for API Lambda (decrypt for reading encrypted data)
data "aws_iam_policy_document" "api_lambda_kms" {
  statement {
    sid    = "AllowKMSDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:DescribeKey"
    ]
    resources = [
      aws_kms_key.artifacts.arn,
      aws_kms_key.dynamodb.arn
    ]
  }
}

resource "aws_iam_role_policy" "api_lambda_kms" {
  name   = "${var.project}-api-lambda-kms"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.api_lambda_kms.json
}

# SQS permissions for API Lambda (dead letter queue access)
data "aws_iam_policy_document" "api_lambda_sqs" {
  statement {
    sid    = "AllowSQSDLQOperations"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [
      aws_sqs_queue.api_dlq.arn
    ]
  }
}

resource "aws_iam_role_policy" "api_lambda_sqs" {
  name   = "${var.project}-api-lambda-sqs"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.api_lambda_sqs.json
}

# ---------- Capture Lambda Role (Playwright) ----------

resource "aws_iam_role" "capture_lambda" {
  name               = "${var.project}-capture-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# CloudWatch Logs permissions for Capture Lambda
data "aws_iam_policy_document" "capture_lambda_logs" {
  statement {
    sid    = "AllowLogging"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project}-capture*"
    ]
  }
}

resource "aws_iam_role_policy" "capture_lambda_logs" {
  name   = "${var.project}-capture-lambda-logs"
  role   = aws_iam_role.capture_lambda.id
  policy = data.aws_iam_policy_document.capture_lambda_logs.json
}

# S3 permissions for Capture Lambda (write artifacts with SSE-KMS)
data "aws_iam_policy_document" "capture_lambda_s3" {
  statement {
    sid    = "AllowS3WriteOperations"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:PutObjectAcl"
    ]
    resources = [
      "${aws_s3_bucket.artifacts.arn}/*"
    ]
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-server-side-encryption-aws-kms-key-id"
      values   = [aws_kms_key.artifacts.arn]
    }
  }
}

resource "aws_iam_role_policy" "capture_lambda_s3" {
  name   = "${var.project}-capture-lambda-s3"
  role   = aws_iam_role.capture_lambda.id
  policy = data.aws_iam_policy_document.capture_lambda_s3.json
}

# DynamoDB permissions for Capture Lambda (write to captures table)
data "aws_iam_policy_document" "capture_lambda_dynamodb" {
  statement {
    sid    = "AllowDynamoDBWrites"
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem"
    ]
    resources = [
      aws_dynamodb_table.captures.arn,
      aws_dynamodb_table.schedules.arn
    ]
  }
}

resource "aws_iam_role_policy" "capture_lambda_dynamodb" {
  name   = "${var.project}-capture-lambda-dynamodb"
  role   = aws_iam_role.capture_lambda.id
  policy = data.aws_iam_policy_document.capture_lambda_dynamodb.json
}

# KMS permissions for Capture Lambda (encrypt artifacts)
data "aws_iam_policy_document" "capture_lambda_kms" {
  statement {
    sid    = "AllowKMSEncryptOperations"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey"
    ]
    resources = [
      aws_kms_key.artifacts.arn,
      aws_kms_key.dynamodb.arn
    ]
  }
}

resource "aws_iam_role_policy" "capture_lambda_kms" {
  name   = "${var.project}-capture-lambda-kms"
  role   = aws_iam_role.capture_lambda.id
  policy = data.aws_iam_policy_document.capture_lambda_kms.json
}

# SQS permissions for Capture Lambda (send messages to DLQ for error handling)
data "aws_iam_policy_document" "capture_lambda_sqs" {
  statement {
    sid    = "AllowSQSOperations"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [
      aws_sqs_queue.jobs_dlq.arn
    ]
  }
}

resource "aws_iam_role_policy" "capture_lambda_sqs" {
  name   = "${var.project}-capture-lambda-sqs"
  role   = aws_iam_role.capture_lambda.id
  policy = data.aws_iam_policy_document.capture_lambda_sqs.json
}

# SQS permissions for Capture Lambda to consume from main jobs queue
data "aws_iam_policy_document" "capture_lambda_sqs_consume" {
  statement {
    sid    = "AllowSQSConsume"
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [
      aws_sqs_queue.jobs.arn
    ]
  }
}

resource "aws_iam_role_policy" "capture_lambda_sqs_consume" {
  name   = "${var.project}-capture-lambda-sqs-consume"
  role   = aws_iam_role.capture_lambda.id
  policy = data.aws_iam_policy_document.capture_lambda_sqs_consume.json
}