variable "project" {
  description = "Project prefix for names."
  type        = string
  default     = "csa"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "artifacts_bucket_name" {
  description = "Name for the artifacts S3 bucket (must be globally unique)."
  type        = string
  default     = null
}

variable "cloudtrail_bucket_name" {
  description = "Bucket to store CloudTrail logs (must be globally unique)."
  type        = string
  default     = null
}

variable "object_lock_days" {
  description = "Default Object Lock retention (governance mode) in days."
  type        = number
  default     = 365
}

variable "artifacts_glacier_days" {
  description = "Transition artifacts to Glacier Instant Retrieval after N days."
  type        = number
  default     = 30
}

variable "eventbridge_rate_minutes" {
  description = "Scheduler frequency in minutes."
  type        = number
  default     = 5
}

variable "queue_max_receive_count" {
  description = "SQS redrive policy (max number of receives before moving to DLQ)."
  type        = number
  default     = 5
}

variable "alert_email_addresses" {
  description = "List of email addresses for alert notifications"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications (optional)"
  type        = string
  default     = null
  sensitive   = true
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD for cost monitoring"
  type        = string
  default     = "100"
}

variable "enable_secret_rotation" {
  description = "Enable automatic secret rotation"
  type        = bool
  default     = false
}
