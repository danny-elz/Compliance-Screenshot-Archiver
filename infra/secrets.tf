# ---------- AWS Secrets Manager Configuration ----------

# Database connection secrets (if using RDS in the future)
resource "aws_secretsmanager_secret" "database_credentials" {
  name                    = "${var.project}/database/credentials"
  description             = "Database credentials for ${var.project}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project}-database-credentials"
  }
}

# API keys for external services
resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "${var.project}/api/keys"
  description             = "External API keys for ${var.project}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project}-api-keys"
  }
}

# JWT signing secrets
resource "aws_secretsmanager_secret" "jwt_secrets" {
  name                    = "${var.project}/jwt/signing-key"
  description             = "JWT signing secrets for ${var.project}"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project}-jwt-secrets"
  }
}

# Webhook secrets for notifications
resource "aws_secretsmanager_secret" "webhook_secrets" {
  name                    = "${var.project}/webhooks/secrets"
  description             = "Webhook secrets for external notifications"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project}-webhook-secrets"
  }
}

# ---------- Secret Versions with Placeholder Values ----------

# Database credentials (placeholder - update with actual values)
resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    username = "csa_app"
    password = "CHANGE_ME_ON_DEPLOYMENT"
    host     = "localhost"
    port     = 5432
    database = "csa_db"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# API keys (placeholder - update with actual values)
resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    slack_webhook_url  = var.slack_webhook_url != null ? var.slack_webhook_url : "CHANGE_ME_ON_DEPLOYMENT"
    external_api_key   = "CHANGE_ME_ON_DEPLOYMENT"
    monitoring_api_key = "CHANGE_ME_ON_DEPLOYMENT"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# JWT signing key (auto-generated)
resource "random_password" "jwt_signing_key" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret_version" "jwt_secrets" {
  secret_id = aws_secretsmanager_secret.jwt_secrets.id
  secret_string = jsonencode({
    signing_key      = random_password.jwt_signing_key.result
    algorithm        = "HS256"
    expiration_hours = 24
  })
}

# Webhook secrets (auto-generated)
resource "random_password" "webhook_signing_secret" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret_version" "webhook_secrets" {
  secret_id = aws_secretsmanager_secret.webhook_secrets.id
  secret_string = jsonencode({
    signing_secret = random_password.webhook_signing_secret.result
    slack_token    = "CHANGE_ME_ON_DEPLOYMENT"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ---------- IAM Policies for Secrets Access ----------

# Policy for Lambda functions to read secrets
data "aws_iam_policy_document" "secrets_read_policy" {
  statement {
    sid    = "AllowSecretsRead"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [
      aws_secretsmanager_secret.database_credentials.arn,
      aws_secretsmanager_secret.api_keys.arn,
      aws_secretsmanager_secret.jwt_secrets.arn,
      aws_secretsmanager_secret.webhook_secrets.arn
    ]
  }
}

# Attach secrets read policy to API Lambda role
resource "aws_iam_role_policy" "api_lambda_secrets" {
  name   = "${var.project}-api-lambda-secrets"
  role   = aws_iam_role.api_lambda.id
  policy = data.aws_iam_policy_document.secrets_read_policy.json
}

# Attach secrets read policy to Capture Lambda role  
resource "aws_iam_role_policy" "capture_lambda_secrets" {
  name   = "${var.project}-capture-lambda-secrets"
  role   = aws_iam_role.capture_lambda.id
  policy = data.aws_iam_policy_document.secrets_read_policy.json
}

# Attach secrets read policy to Scheduler Lambda role
resource "aws_iam_role_policy" "scheduler_lambda_secrets" {
  name   = "${var.project}-scheduler-lambda-secrets"
  role   = aws_iam_role.scheduler_lambda.id
  policy = data.aws_iam_policy_document.secrets_read_policy.json
}

# ---------- Secret Rotation Configuration ----------

# Enable automatic rotation for database credentials
resource "aws_secretsmanager_secret_rotation" "database_credentials" {
  count               = var.enable_secret_rotation ? 1 : 0
  secret_id           = aws_secretsmanager_secret.database_credentials.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation[0].arn

  rotation_rules {
    automatically_after_days = 30
  }

  depends_on = [aws_lambda_permission.secrets_manager_rotation]
}

# Lambda function for secret rotation (optional)
resource "aws_lambda_function" "secret_rotation" {
  count         = var.enable_secret_rotation ? 1 : 0
  function_name = "${var.project}-secret-rotation"
  role          = aws_iam_role.secret_rotation[0].arn

  # Use a pre-built rotation function or custom implementation
  filename         = "secret_rotation_placeholder.zip"
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  source_code_hash = data.archive_file.secret_rotation_placeholder[0].output_base64sha256

  timeout = 30

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.aws_region}.amazonaws.com"
    }
  }

  tags = {
    Name = "${var.project}-secret-rotation-lambda"
  }
}

# Placeholder rotation function
data "archive_file" "secret_rotation_placeholder" {
  count       = var.enable_secret_rotation ? 1 : 0
  type        = "zip"
  output_path = "secret_rotation_placeholder.zip"

  source {
    content  = <<EOF
import json
import boto3
import os

def lambda_handler(event, context):
    """
    Placeholder secret rotation function.
    This should be replaced with actual rotation logic.
    """
    print(f"Secret rotation triggered: {json.dumps(event)}")
    
    # TODO: Implement secret rotation logic
    # 1. Create new secret version
    # 2. Test new credentials
    # 3. Update application configuration
    # 4. Mark secret as current
    
    return {
        'statusCode': 200,
        'body': json.dumps('Secret rotation completed')
    }
EOF
    filename = "lambda_function.py"
  }
}

# IAM role for secret rotation Lambda
resource "aws_iam_role" "secret_rotation" {
  count              = var.enable_secret_rotation ? 1 : 0
  name               = "${var.project}-secret-rotation-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

# Policy for secret rotation
data "aws_iam_policy_document" "secret_rotation_policy" {
  count = var.enable_secret_rotation ? 1 : 0

  statement {
    sid    = "AllowSecretsRotation"
    effect = "Allow"
    actions = [
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
      "secretsmanager:UpdateSecretVersionStage"
    ]
    resources = [
      aws_secretsmanager_secret.database_credentials.arn,
      aws_secretsmanager_secret.api_keys.arn,
      aws_secretsmanager_secret.jwt_secrets.arn
    ]
  }

  statement {
    sid    = "AllowLogging"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "secret_rotation" {
  count  = var.enable_secret_rotation ? 1 : 0
  name   = "${var.project}-secret-rotation-policy"
  role   = aws_iam_role.secret_rotation[0].id
  policy = data.aws_iam_policy_document.secret_rotation_policy[0].json
}

# Permission for Secrets Manager to invoke rotation Lambda
resource "aws_lambda_permission" "secrets_manager_rotation" {
  count         = var.enable_secret_rotation ? 1 : 0
  statement_id  = "AllowSecretsManagerRotation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation[0].function_name
  principal     = "secretsmanager.amazonaws.com"
}