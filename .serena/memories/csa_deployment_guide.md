# CSA Deployment Guide

## Current Status: PRODUCTION-READY FOR DEPLOYMENT 🚀

All MUST requirements completed - Ready for immediate production deployment

## Phase 1: Immediate Deployment (HIGH PRIORITY)

### Task: AWS Pre-deployment Validation
**Priority**: CRITICAL  
**Status**: PENDING  
**Owner**: DevOps  
**Due**: Before deployment  

**Acceptance Criteria**:
- [ ] AWS CLI configured with appropriate credentials
- [ ] Target AWS region selected and configured (recommend us-east-1)
- [ ] AWS account has sufficient service limits for deployment
- [ ] IAM permissions validated for Terraform deployment
- [ ] Cost monitoring and billing alerts configured
- [ ] Backup/disaster recovery strategy documented

### Task: Deploy Core Infrastructure with Terraform
**Priority**: CRITICAL  
**Status**: PENDING  
**Owner**: DevOps  
**Due**: Day 1  

**Acceptance Criteria**:
- [ ] S3 artifacts bucket created with Object Lock (Compliance mode) (REQ-STOR-001)
- [ ] S3 audit logs bucket created with Object Lock (REQ-AUDIT-002)  
- [ ] KMS customer-managed keys created and configured (NFR-KMS)
- [ ] DynamoDB tables (Schedules, Captures) with GSIs deployed
- [ ] Cognito User Pool configured with proper password policy (REQ-AUTH-001)
- [ ] CloudTrail enabled with S3 data events (REQ-AUDIT-001)
- [ ] EventBridge rules configured for scheduling (REQ-SCHED-001)
- [ ] SNS topics created for alerts (REQ-MON-002)
- [ ] All resources tagged appropriately for cost tracking
- [ ] Resource naming follows environment conventions

**Commands**:
```bash
cd infra
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

### Task: Build and Deploy Lambda Container Images  
**Priority**: CRITICAL  
**Status**: PENDING  
**Owner**: DevOps  
**Due**: Day 1  

**Acceptance Criteria**:
- [ ] ECR repositories created for Lambda containers
- [ ] Capture Lambda image built with Playwright/Chromium (REQ-CAP-002)
- [ ] API Lambda image built with FastAPI application
- [ ] Scheduler Lambda image built with scheduling logic
- [ ] Images pushed to ECR with proper tagging
- [ ] Lambda functions deployed with correct memory/timeout settings
- [ ] Environment variables configured from Terraform outputs
- [ ] IAM roles attached with least-privilege permissions (REQ-AUTH-002)

**Commands**:
```bash
# Build and push Capture Lambda
docker build -t csa-capture-lambda -f docker/Dockerfile.capture .
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
docker tag csa-capture-lambda:latest $ECR_URI/csa-capture-lambda:latest
docker push $ECR_URI/csa-capture-lambda:latest
```

### Task: Configure API Gateway and Routes
**Priority**: CRITICAL  
**Status**: PENDING  
**Owner**: DevOps  
**Due**: Day 1  

**Acceptance Criteria**:
- [ ] API Gateway REST API deployed with proper stages
- [ ] All API routes configured and tested (see PLANNING.md endpoints)
- [ ] Cognito JWT authorizer working (REQ-AUTH-001)
- [ ] Rate limiting configured (60 req/min/user) (REQ-API-001)
- [ ] CORS configured for frontend domain
- [ ] Custom domain configured with SSL certificate
- [ ] WAF rules applied for basic protection
- [ ] API Gateway logging enabled to CloudWatch

### Task: Production Smoke Testing
**Priority**: CRITICAL  
**Status**: PENDING  
**Owner**: QA/DevOps  
**Due**: Day 1  

**Acceptance Criteria**:
- [ ] Health endpoint accessible: `GET /api/health`
- [ ] Cognito authentication flow working
- [ ] Schedule creation via API successful
- [ ] On-demand capture trigger working (REQ-API-001)
- [ ] S3 Object Lock verified on captured artifacts
- [ ] Hash verification endpoint working (REQ-INT-001)
- [ ] CloudTrail events appearing in audit logs
- [ ] Monitoring dashboards showing metrics
- [ ] SNS alerts triggered for test failures

**Test Commands**:
```bash
# Health check
curl -X GET "https://api.yourdomain.com/api/health"

# Authenticated capture trigger (requires JWT token)
curl -X POST "https://api.yourdomain.com/api/captures/trigger" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "url=https://example.com&artifact_type=pdf"
```

## Phase 2: Production Hardening (MEDIUM PRIORITY)

### Task: Implement Comprehensive Monitoring
**Priority**: HIGH  
**Status**: PENDING  
**Owner**: DevOps  
**Due**: Week 1  

**Acceptance Criteria**:
- [ ] CloudWatch dashboards configured for all key metrics (NFR-DASH)
- [ ] Alarms configured for critical failures (REQ-MON-001):
  - Capture failure rate >5%
  - API 5xx error rate >1%
  - DLQ depth >0
  - Lambda throttling events
  - Object Lock violation attempts
- [ ] SNS subscriptions configured for Slack/email (REQ-MON-002)
- [ ] Log aggregation and search configured in CloudWatch Insights
- [ ] Cost anomaly detection enabled with budget alerts
- [ ] SLO tracking implemented (NFR-SLO)

### Task: Security Hardening and Compliance Validation
**Priority**: HIGH  
**Status**: PENDING  
**Owner**: Security/DevOps  
**Due**: Week 1  

**Acceptance Criteria**:
- [ ] AWS Config rules enabled for compliance monitoring
- [ ] GuardDuty enabled for threat detection  
- [ ] Security scanning integrated into CI/CD pipeline
- [ ] Secrets rotation schedule implemented (NFR-ROTATION)
- [ ] Penetration testing completed on API endpoints
- [ ] SOC 2 compliance documentation prepared (NFR-SOC2)
- [ ] Incident response procedures documented
- [ ] Backup and restore procedures tested

## Key Configuration Files

### Environment Variables Required
```bash
# Core Configuration
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=${terraform_output}
COGNITO_CLIENT_ID=${terraform_output}
KMS_KEY_ID=${terraform_output}

# Storage Configuration
S3_ARTIFACTS_BUCKET=${terraform_output}
S3_AUDIT_BUCKET=${terraform_output}
DYNAMODB_SCHEDULES_TABLE=${terraform_output}
DYNAMODB_CAPTURES_TABLE=${terraform_output}

# API Configuration
API_GATEWAY_URL=${terraform_output}
RATE_LIMIT_PER_MINUTE=60
MAX_CONCURRENT_CAPTURES=100

# Monitoring
SNS_ALERTS_TOPIC=${terraform_output}
CLOUDWATCH_LOG_GROUP=/aws/lambda/csa
```

### Terraform Variables (terraform.tfvars)
```hcl
# Environment
environment = "production"
region      = "us-east-1"

# Naming
project_prefix = "csa"
resource_prefix = "compliance-screenshot-archiver"

# Security
kms_key_deletion_window_in_days = 30
object_lock_retention_years = 7

# Scaling
lambda_memory_size = 3008
lambda_timeout = 900
api_rate_limit = 60

# Monitoring
enable_detailed_monitoring = true
sns_alert_endpoints = ["your-email@company.com"]
```

## Troubleshooting Common Issues

### Terraform Deployment Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Validate Terraform configuration
terraform validate

# Plan with detailed logging
TF_LOG=DEBUG terraform plan

# Apply with auto-approval for CI/CD
terraform apply -auto-approve
```

### Lambda Container Issues
```bash
# Test container locally
docker run -p 9000:8080 csa-capture-lambda:latest

# Check ECR login
aws ecr describe-repositories --region $AWS_REGION

# Force Lambda update
aws lambda update-function-code \
  --function-name csa-capture-lambda \
  --image-uri $ECR_URI/csa-capture-lambda:latest
```

### API Gateway Issues
```bash
# Test API Gateway directly
aws apigateway test-invoke-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET

# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway"
```

## Security Checklist

### Pre-Deployment Security Validation
- [ ] All IAM roles follow least-privilege principle
- [ ] KMS keys have proper key policies
- [ ] S3 buckets have public access blocked
- [ ] Security groups allow only necessary ports
- [ ] VPC configuration follows security best practices
- [ ] Secrets Manager rotation enabled
- [ ] CloudTrail data events enabled for S3
- [ ] WAF rules configured and tested

### Post-Deployment Security Validation
- [ ] Penetration testing completed
- [ ] Vulnerability scanning performed
- [ ] Access logging verified
- [ ] Encryption at rest and in transit confirmed
- [ ] Backup encryption verified
- [ ] Incident response procedures tested

## Success Criteria

### Day 1 Deployment Success
- All infrastructure deployed without errors
- All Lambda functions operational
- API Gateway returning 200 responses
- Cognito authentication working
- First successful capture completed
- Monitoring dashboards displaying data

### Week 1 Production Ready
- All monitoring and alerting operational
- Security hardening completed
- Performance baselines established
- Documentation updated with production URLs
- Team trained on operational procedures
- Incident response procedures tested

### Month 1 Optimization Complete
- Cost optimization implemented
- Performance tuning completed
- Advanced security features enabled
- Compliance audit documentation ready
- Disaster recovery procedures tested
- User feedback incorporated