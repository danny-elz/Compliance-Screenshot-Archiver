# Infra: Terraform Starter

## What you get
- S3 artifacts bucket with **Object Lock (governance)**, versioning, **SSE-KMS**, lifecycle to Glacier IR.
- KMS keys for artifacts and CloudTrail.
- CloudTrail (multi-region) that captures **S3 data events** for the artifacts bucket.
- EventBridge scheduler → SQS jobs queue with **DLQ**, and a target-level **DLQ**.

> **Note:** S3 **Object Lock** must be enabled at bucket creation and cannot be retrofitted.

## Usage
```bash
cd infra
terraform init
terraform validate
terraform plan -out plan.tfplan
terraform apply plan.tfplan
