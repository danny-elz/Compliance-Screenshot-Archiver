# CSA Infrastructure - Terraform Configuration

Complete Terraform infrastructure for the Compliance Screenshot Archiver (CSA) project, designed to meet all requirements from TASK.md including compliance, security, and auditability.

## 🏗️ Architecture Overview

The infrastructure supports the CSA architecture: **API Gateway → FastAPI → EventBridge → Capture Lambda → S3 + DynamoDB**

### Core Components

**Storage & Compliance**
- S3 artifacts bucket with **Object Lock (COMPLIANCE mode)** - 7-year retention
- S3 audit logs bucket with **Object Lock (COMPLIANCE mode)** - 7-year retention  
- DynamoDB tables for schedules and captures with point-in-time recovery
- All storage encrypted with customer-managed KMS keys

**Compute & API**
- API Gateway with Cognito authorization
- Lambda functions: API (FastAPI), Capture (Playwright), Scheduler
- EventBridge for scheduled executions
- SQS queues with Dead Letter Queues for reliability

**Security & Authentication**
- Cognito User Pool with MFA support and user groups (admin, user, auditor)
- IAM roles with least-privilege permissions
- Secrets Manager for API keys and credentials
- CloudTrail with S3 data events for complete audit trail

**Monitoring & Alerting**
- CloudWatch dashboards and alarms
- SNS topics for alerts (email and Slack integration)
- Cost budgets and monitoring
- Structured logging for all components

## 📋 Requirements Met

✅ **REQ-STOR-001**: S3 Object Lock in Compliance mode with 7-year retention  
✅ **REQ-STOR-002**: SSE-KMS encryption for all storage  
✅ **REQ-AUDIT-001**: CloudTrail with S3 data events enabled  
✅ **REQ-AUDIT-002**: Audit logs in Object Lock protected bucket  
✅ **REQ-AUTH-001**: Cognito with secure password policy and MFA  
✅ **REQ-AUTH-002**: IAM roles with minimal permissions  
✅ **REQ-MON-001**: CloudWatch alarms for critical failures  
✅ **NFR-KMS**: Customer-managed keys with rotation enabled  
✅ **NFR-SECURITY**: Advanced security configurations  

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Terraform ≥ 1.6.0** installed
3. **Make** (optional, for convenience commands)

### Deployment Steps

1. **Clone and navigate**:
   ```bash
   cd infra
   ```

2. **Configure variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your settings
   ```

3. **Deploy using Make** (recommended):
   ```bash
   make plan    # Review the execution plan
   make apply   # Deploy infrastructure
   ```

   Or **manually**:
   ```bash
   terraform init
   terraform plan -var-file=terraform.tfvars
   terraform apply -var-file=terraform.tfvars
   ```

## 📁 File Structure

```
infra/
├── providers.tf           # Provider configuration and versions
├── variables.tf           # Input variables
├── outputs.tf             # Output values
├── kms.tf                 # KMS keys for encryption
├── s3_artifacts.tf        # S3 buckets with Object Lock
├── dynamodb.tf            # DynamoDB tables
├── cloudtrail.tf          # CloudTrail for audit logging
├── cognito.tf             # User authentication
├── api_gateway.tf         # API Gateway configuration
├── lambda.tf              # Lambda functions
├── iam.tf                 # IAM roles and policies
├── eventbridge_sqs_lambda.tf # Event scheduling
├── monitoring.tf          # CloudWatch and SNS
├── secrets.tf             # Secrets Manager
├── terraform.tfvars.example # Example configuration
├── Makefile              # Convenience commands
└── README.md             # This file
```

## ⚙️ Configuration

### Required Variables

Copy `terraform.tfvars.example` to `terraform.tfvars` and customize:

```hcl
# Basic Configuration
project    = "csa"
aws_region = "us-east-1"

# Alerting
alert_email_addresses = ["admin@yourcompany.com"]

# Budget
monthly_budget_limit = "100"
```

### Optional Variables

```hcl
# Custom S3 bucket names (defaults to auto-generated)
artifacts_bucket_name   = "my-csa-artifacts"
cloudtrail_bucket_name = "my-csa-audit-logs"

# Slack integration
slack_webhook_url = "https://hooks.slack.com/services/..."

# Secret rotation
enable_secret_rotation = true
```

## 🔧 Make Commands

The included Makefile provides convenient commands:

```bash
make help      # Show all available commands
make init      # Initialize Terraform
make check     # Validate and format
make plan      # Generate execution plan
make apply     # Deploy infrastructure
make destroy   # Destroy infrastructure (with confirmations)
make output    # Show outputs
make cost      # Estimate costs (requires infracost)
make security  # Security scan (requires checkov)
```

## 📊 Outputs

After deployment, important values are output:

```bash
make output
```

Key outputs include:
- API Gateway URL
- Cognito User Pool IDs
- S3 bucket names
- Lambda function names
- CloudWatch dashboard URL

## 🔒 Security Features

### Object Lock Compliance
- **COMPLIANCE mode** (cannot be disabled or shortened)
- **7-year retention** as required by regulations
- Prevents deletion or modification of stored artifacts

### Encryption
- **Customer-managed KMS keys** for all services
- **Automatic key rotation** enabled
- **Separate keys** for different services (artifacts, DynamoDB, CloudTrail)

### Access Control
- **Least-privilege IAM roles** for each Lambda function
- **Cognito User Pool** with secure password policy
- **MFA support** for administrative users
- **User groups** (admin, user, auditor) with different permissions

### Audit Trail
- **CloudTrail** captures all API calls
- **S3 data events** for complete artifact access logging
- **Structured logging** in all Lambda functions
- **Audit logs** stored in Object Lock protected bucket

## 📈 Monitoring

### CloudWatch Dashboard
- Lambda function metrics (invocations, errors, duration)
- DynamoDB performance and throttling
- S3 storage utilization
- SQS queue depths

### Alerts
- **Critical**: Capture failures, Object Lock violations
- **Standard**: General errors, DLQ messages, throttling
- **Cost**: Budget threshold warnings

### Cost Management
- Monthly budget with email alerts
- Cost tracking dashboard
- Resource tagging for cost allocation

## 🔄 CI/CD Integration

The infrastructure is designed for CI/CD integration:

1. **Validation**: `make check` in CI pipelines
2. **Planning**: `make plan` for PR reviews
3. **Deployment**: `make apply-auto` for automated deployments
4. **Cost Control**: `make cost` for cost impact analysis

## 🚨 Important Notes

### Object Lock Considerations
- **Cannot be disabled** once enabled
- **Cannot reduce retention period** in COMPLIANCE mode
- **Buckets cannot be deleted** while containing locked objects
- **Plan retention carefully** - 7 years is a long time!

### Lambda Container Images
The configuration expects container images in ECR:
- `{account-id}.dkr.ecr.{region}.amazonaws.com/csa-api:latest`
- `{account-id}.dkr.ecr.{region}.amazonaws.com/csa-capture:latest`

Build and push these images before deploying the infrastructure.

### Secrets Management
- Default secrets are created with placeholder values
- **Update secrets** after deployment with actual values
- Use `enable_secret_rotation = true` for automatic rotation

## 🆘 Troubleshooting

### Common Issues

**State Lock**: If Terraform state gets locked:
```bash
make unlock LOCK_ID=<lock-id-from-error>
```

**Resource Import**: To import existing AWS resources:
```bash
make import RESOURCE=aws_s3_bucket.example ID=bucket-name
```

**Cost Issues**: Monitor costs with:
```bash
make cost  # Requires infracost CLI
```

**Security Scan**: Check security with:
```bash
make security  # Requires checkov CLI
```

### Validation Errors
Always run validation before deployment:
```bash
make check
```

### State Management
- State is stored locally by default
- For team environments, configure S3 backend
- Always backup state before major changes

## 📚 Additional Resources

- [AWS Object Lock Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS KMS Best Practices](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html)
- [CloudTrail Data Events](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/data-events.html)

## 🎯 Next Steps

1. **Deploy the infrastructure**
2. **Build and push Lambda container images**
3. **Update Secrets Manager** with real values
4. **Configure Cognito users** and groups
5. **Test the complete workflow**
6. **Set up monitoring alerts**
7. **Document operational procedures**