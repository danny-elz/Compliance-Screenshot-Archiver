# DynamoDB Tables for Schedules and Captures

# Schedules Table
resource "aws_dynamodb_table" "schedules" {
  name         = "${var.project}-schedules"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "schedule_id"

  attribute {
    name = "schedule_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "next_capture_time"
    type = "N"
  }

  # GSI for querying schedules by user
  global_secondary_index {
    name            = "UserSchedulesIndex"
    hash_key        = "user_id"
    range_key       = "next_capture_time"
    projection_type = "ALL"
  }

  # GSI for finding schedules ready to execute
  global_secondary_index {
    name            = "NextCaptureIndex"
    hash_key        = "next_capture_time"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  tags = {
    Name = "${var.project}-schedules"
  }
}

# Captures Table
resource "aws_dynamodb_table" "captures" {
  name         = "${var.project}-captures"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "capture_id"
  range_key    = "created_at"

  attribute {
    name = "capture_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "url"
    type = "S"
  }

  attribute {
    name = "sha256"
    type = "S"
  }

  # GSI for querying captures by user
  global_secondary_index {
    name            = "UserCapturesIndex"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for querying captures by URL
  global_secondary_index {
    name            = "UrlCapturesIndex"
    hash_key        = "url"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for verifying by SHA-256 hash
  global_secondary_index {
    name            = "HashIndex"
    hash_key        = "sha256"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  ttl {
    enabled        = false
    attribute_name = "ttl"
  }

  tags = {
    Name = "${var.project}-captures"
  }
}

# Outputs for application configuration
output "dynamodb_schedules_table" {
  value       = aws_dynamodb_table.schedules.name
  description = "Name of the DynamoDB schedules table"
}

output "dynamodb_captures_table" {
  value       = aws_dynamodb_table.captures.name
  description = "Name of the DynamoDB captures table"
}