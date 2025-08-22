# ---------- SNS Topics for Alerts ----------

# Main alerting topic
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-alerts"

  # Enable encryption for sensitive alert data
  kms_master_key_id = aws_kms_key.cloudtrail.arn

  tags = {
    Name = "${var.project}-alerts"
  }
}

# Critical alerts topic (for immediate response)
resource "aws_sns_topic" "critical_alerts" {
  name = "${var.project}-critical-alerts"

  # Enable encryption
  kms_master_key_id = aws_kms_key.cloudtrail.arn

  tags = {
    Name = "${var.project}-critical-alerts"
  }
}

# ---------- SNS Topic Subscriptions ----------

# Email subscription for critical alerts
resource "aws_sns_topic_subscription" "critical_email" {
  count     = length(var.alert_email_addresses)
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# Email subscription for general alerts
resource "aws_sns_topic_subscription" "general_email" {
  count     = length(var.alert_email_addresses)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# Slack webhook subscription (optional)
resource "aws_sns_topic_subscription" "slack_webhook" {
  count     = var.slack_webhook_url != null ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# ---------- CloudWatch Alarms for Lambda Functions ----------

# API Lambda error rate alarm
resource "aws_cloudwatch_metric_alarm" "api_lambda_errors" {
  alarm_name          = "${var.project}-api-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors API Lambda errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.api.function_name
  }

  tags = {
    Name = "${var.project}-api-lambda-errors"
  }
}

# Capture Lambda error rate alarm (critical for compliance)
resource "aws_cloudwatch_metric_alarm" "capture_lambda_errors" {
  alarm_name          = "${var.project}-capture-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "3"
  alarm_description   = "This metric monitors capture Lambda errors - critical for compliance"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.capture.function_name
  }

  tags = {
    Name = "${var.project}-capture-lambda-errors"
  }
}

# Scheduler Lambda missed runs alarm
resource "aws_cloudwatch_metric_alarm" "scheduler_lambda_errors" {
  alarm_name          = "${var.project}-scheduler-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "600"
  statistic           = "Sum"
  threshold           = "2"
  alarm_description   = "This metric monitors scheduler Lambda errors - affects scheduled captures"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.scheduler.function_name
  }

  tags = {
    Name = "${var.project}-scheduler-lambda-errors"
  }
}

# ---------- CloudWatch Alarms for DynamoDB ----------

# DynamoDB throttled requests alarm
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  alarm_name          = "${var.project}-dynamodb-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors DynamoDB throttling"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.schedules.name
  }

  tags = {
    Name = "${var.project}-dynamodb-throttles"
  }
}

# ---------- CloudWatch Alarms for S3 ----------

# S3 Object Lock compliance alarm (custom metric via CloudTrail)
resource "aws_cloudwatch_metric_alarm" "s3_object_lock_violations" {
  alarm_name          = "${var.project}-s3-object-lock-violations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ObjectLockViolations"
  namespace           = "CSA/S3"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors S3 Object Lock violations - critical for compliance"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = {
    Name = "${var.project}-s3-object-lock-violations"
  }
}

# ---------- CloudWatch Alarms for SQS Dead Letter Queues ----------

# Jobs DLQ alarm
resource "aws_cloudwatch_metric_alarm" "jobs_dlq_messages" {
  alarm_name          = "${var.project}-jobs-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors messages in the jobs DLQ"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.jobs_dlq.name
  }

  tags = {
    Name = "${var.project}-jobs-dlq-messages"
  }
}

# ---------- CloudWatch Dashboard ----------

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.api.function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."],
            [".", "Invocations", "FunctionName", aws_lambda_function.capture.function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."],
            [".", "Invocations", "FunctionName", aws_lambda_function.scheduler.function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Lambda Function Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.schedules.name],
            [".", "ConsumedWriteCapacityUnits", ".", "."],
            [".", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.captures.name],
            [".", "ConsumedWriteCapacityUnits", ".", "."],
            [".", "ThrottledRequests", "TableName", aws_dynamodb_table.schedules.name],
            [".", ".", "TableName", aws_dynamodb_table.captures.name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "DynamoDB Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/S3", "NumberOfObjects", "BucketName", aws_s3_bucket.artifacts.bucket, "StorageType", "AllStorageTypes"],
            [".", "BucketSizeBytes", ".", ".", ".", "StandardStorage"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "S3 Storage Metrics"
          period  = 86400
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfVisibleMessages", "QueueName", aws_sqs_queue.jobs.name],
            [".", ".", "QueueName", aws_sqs_queue.jobs_dlq.name],
            [".", "NumberOfMessagesSent", "QueueName", aws_sqs_queue.jobs.name],
            [".", "NumberOfMessagesReceived", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "SQS Queue Metrics"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 24
        width  = 24
        height = 6

        properties = {
          query  = "SOURCE '/aws/lambda/${var.project}-capture' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 50"
          region = var.aws_region
          title  = "Recent Capture Lambda Errors"
          view   = "table"
        }
      }
    ]
  })
}

# ---------- Cost Monitoring ----------

# Cost budget for the project
resource "aws_budgets_budget" "project_cost" {
  name              = "${var.project}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2024-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = ["Amazon Simple Storage Service", "AWS Lambda", "Amazon DynamoDB", "Amazon Simple Queue Service", "Amazon CloudWatch", "AWS CloudTrail"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email_addresses
  }
}