output "artifacts_bucket" {
  value       = aws_s3_bucket.artifacts.bucket
  description = "Artifacts S3 bucket (Object Lock enabled)"
}

output "artifacts_kms_key_arn" {
  value       = aws_kms_key.artifacts.arn
  description = "KMS CMK for artifacts bucket"
}

output "cloudtrail_bucket" {
  value       = aws_s3_bucket.trail.bucket
  description = "CloudTrail logs bucket"
}

output "cloudtrail_kms_key_arn" {
  value       = aws_kms_key.cloudtrail.arn
  description = "KMS CMK for CloudTrail"
}

output "cloudtrail_arn" {
  value       = aws_cloudtrail.main.arn
  description = "CloudTrail trail ARN"
}

output "jobs_queue_url" {
  value       = aws_sqs_queue.jobs.id
  description = "Main jobs SQS queue URL"
}

output "jobs_dlq_url" {
  value       = aws_sqs_queue.jobs_dlq.id
  description = "Jobs DLQ URL"
}

output "event_target_dlq_url" {
  value       = aws_sqs_queue.event_target_dlq.id
  description = "Event target DLQ URL"
}

# DynamoDB outputs
output "dynamodb_schedules_table_name" {
  value       = aws_dynamodb_table.schedules.name
  description = "DynamoDB schedules table name"
}

output "dynamodb_captures_table_name" {
  value       = aws_dynamodb_table.captures.name
  description = "DynamoDB captures table name"
}

output "dynamodb_kms_key_arn" {
  value       = aws_kms_key.dynamodb.arn
  description = "KMS key ARN for DynamoDB encryption"
}

# Lambda function outputs
output "api_lambda_function_name" {
  value       = aws_lambda_function.api.function_name
  description = "API Lambda function name"
}

output "capture_lambda_function_name" {
  value       = aws_lambda_function.capture.function_name
  description = "Capture Lambda function name"
}

output "scheduler_lambda_function_name" {
  value       = aws_lambda_function.scheduler.function_name
  description = "Scheduler Lambda function name"
}

# API Gateway outputs
output "api_gateway_url" {
  value       = aws_api_gateway_stage.prod.invoke_url
  description = "API Gateway invoke URL"
}

output "api_gateway_rest_api_id" {
  value       = aws_api_gateway_rest_api.main.id
  description = "API Gateway REST API ID"
}

# Cognito outputs
output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.main.id
  description = "Cognito User Pool ID"
}

output "cognito_user_pool_client_id" {
  value       = aws_cognito_user_pool_client.api_client.id
  description = "Cognito User Pool Client ID"
}

output "cognito_user_pool_domain" {
  value       = aws_cognito_user_pool_domain.main.domain
  description = "Cognito User Pool Domain"
}

output "cognito_identity_pool_id" {
  value       = aws_cognito_identity_pool.main.id
  description = "Cognito Identity Pool ID"
}

# Monitoring outputs
output "sns_alerts_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "SNS alerts topic ARN"
}

output "sns_critical_alerts_topic_arn" {
  value       = aws_sns_topic.critical_alerts.arn
  description = "SNS critical alerts topic ARN"
}

output "cloudwatch_dashboard_url" {
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
  description = "CloudWatch dashboard URL"
}

# Secrets Manager outputs
output "secrets_database_credentials_arn" {
  value       = aws_secretsmanager_secret.database_credentials.arn
  description = "Database credentials secret ARN"
}

output "secrets_api_keys_arn" {
  value       = aws_secretsmanager_secret.api_keys.arn
  description = "API keys secret ARN"
}

output "secrets_jwt_secrets_arn" {
  value       = aws_secretsmanager_secret.jwt_secrets.arn
  description = "JWT secrets ARN"
}
