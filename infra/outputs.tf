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
