locals {
  artifacts_bucket = coalesce(var.artifacts_bucket_name, "${var.project}-artifacts-${data.aws_caller_identity.current.account_id}")
  trail_bucket     = coalesce(var.cloudtrail_bucket_name, "${var.project}-trail-${data.aws_caller_identity.current.account_id}")
}

# ---------- Artifacts Bucket (with Object Lock) ----------
resource "aws_s3_bucket" "artifacts" {
  bucket              = local.artifacts_bucket
  object_lock_enabled = true  # must be set at creation time
  force_destroy       = false
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.bucket

  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = var.object_lock_days
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.artifacts.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Deny non-TLS and unencrypted puts, and pin to our KMS key
resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid      = "DenyInsecureTransport",
        Effect   = "Deny",
        Principal = "*",
        Action   = "s3:*",
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ],
        Condition = { Bool = { "aws:SecureTransport": false } }
      },
      {
        Sid      = "DenyUnencryptedObjectUploads",
        Effect   = "Deny",
        Principal = "*",
        Action   = "s3:PutObject",
        Resource = "${aws_s3_bucket.artifacts.arn}/*",
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption": "aws:kms"
          }
        }
      },
      {
        Sid      = "DenyWrongKMSKey",
        Effect   = "Deny",
        Principal = "*",
        Action   = "s3:PutObject",
        Resource = "${aws_s3_bucket.artifacts.arn}/*",
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption-aws-kms-key-id": aws_kms_key.artifacts.arn
          }
        }
      }
    ]
  })
}

# Lifecycle: transition to Glacier IR after N days (provider v6+ needs a filter/prefix)
resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "transition-to-glacier-ir"
    status = "Enabled"

    # Required in AWS provider v6+: scope the rule ("" = apply to all objects)
    filter {
      prefix = ""
    }

    transition {
      days          = var.artifacts_glacier_days
      storage_class = "GLACIER_IR"
    }

    noncurrent_version_transition {
      noncurrent_days = var.artifacts_glacier_days
      storage_class   = "GLACIER_IR"
    }
  }
}

# ---------- CloudTrail Logs Bucket ----------
resource "aws_s3_bucket" "trail" {
  bucket        = local.trail_bucket
  force_destroy = false
}

resource "aws_s3_bucket_versioning" "trail" {
  bucket = aws_s3_bucket.trail.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "trail" {
  bucket = aws_s3_bucket.trail.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.cloudtrail.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "trail" {
  bucket                  = aws_s3_bucket.trail.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Allow CloudTrail to write logs to this bucket
resource "aws_s3_bucket_policy" "trail" {
  bucket = aws_s3_bucket.trail.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid      = "AWSCloudTrailAclCheck",
        Effect   = "Allow",
        Principal = { "Service": "cloudtrail.amazonaws.com" },
        Action   = "s3:GetBucketAcl",
        Resource = aws_s3_bucket.trail.arn
      },
      {
        Sid      = "AWSCloudTrailWrite",
        Effect   = "Allow",
        Principal = { "Service": "cloudtrail.amazonaws.com" },
        Action   = "s3:PutObject",
        Resource = "${aws_s3_bucket.trail.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*",
        Condition = {
          StringEquals = {
            "s3:x-amz-acl": "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}
