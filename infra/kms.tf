# KMS key for artifacts (S3 SSE-KMS)
resource "aws_kms_key" "artifacts" {
  description             = "KMS CMK for artifacts bucket"
  enable_key_rotation     = true
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "artifacts" {
  name          = "alias/${var.project}-artifacts"
  target_key_id = aws_kms_key.artifacts.key_id
}

# KMS key for CloudTrail log encryption
resource "aws_kms_key" "cloudtrail" {
  description             = "KMS CMK for CloudTrail logs"
  enable_key_rotation     = true
  deletion_window_in_days = 7

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudTrail"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

resource "aws_kms_alias" "cloudtrail" {
  name          = "alias/${var.project}-cloudtrail"
  target_key_id = aws_kms_key.cloudtrail.key_id
}
