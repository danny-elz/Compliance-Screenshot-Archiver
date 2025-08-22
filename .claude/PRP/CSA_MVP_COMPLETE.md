# Product Requirements Prompt (PRP) — Compliance Screenshot Archiver MVP

## Feature Summary

**Purpose**: Implement a complete MVP vertical slice for the Compliance Screenshot Archiver that delivers **immutable, verifiable evidence** of web page content at specific points in time. This system provides **WORM (Write Once Read Many)** storage using S3 Object Lock (Compliance mode) with cryptographic integrity verification via SHA-256 hashing. The feature enables compliance officers, auditors, and legal teams to capture, store, and verify webpage screenshots/PDFs with complete audit trails for regulatory requirements.

**Success Criteria**: 
- On-demand capture endpoint produces PDF artifacts with SHA-256 integrity hashes
- Artifacts stored immutably in S3 with Object Lock (Compliance mode) 
- Complete API surface for triggering, listing, verifying, and downloading captures
- Basic web UI for viewing and verifying captures
- Full audit trail via CloudTrail S3 data events

**Out of Scope**: Scheduled captures (EventBridge), multi-tenant RBAC, visual diffing, crawling, non-AWS deployment

---

## Architecture & Flows (CSA)

### High-Level Architecture Path
```
Client → API Gateway → FastAPI (Lambda) → [Future: EventBridge Scheduler] → Capture Lambda (Playwright/Chromium) → S3 (Object Lock) + DynamoDB
                                     ↓
                               DLQ + Retry Logic
```

### Detailed Component Flow

**API Layer**: 
- API Gateway REST with JWT authorizer (Cognito User Pool)
- FastAPI Lambda with routes: `/captures/trigger`, `/captures/{id}`, `/captures/{id}/verify`, `/captures/{id}/download`
- Rate limiting (60 req/min/user) and idempotency key support
- **MISSING**: Cognito User Pool and JWT validation infrastructure

**Capture Pipeline**:
1. `POST /captures/trigger` → FastAPI handler validates request → invokes Capture Lambda (direct or via SQS)
2. Capture Lambda (container image) → Playwright/Chromium renders page with deterministic settings
3. Multi-phase wait strategy: DOM load → JS execution → network idle → stabilization
4. Generate PDF with tamper-evident headers/footers and metadata
5. Compute SHA-256 hash of PDF bytes + optional HMAC signature
6. `put_object` to S3 with SSE-KMS encryption, Object Lock, and comprehensive metadata
7. Write DynamoDB record with capture metadata, hash, and audit trail
8. **Error Handling**: DLQ for failed captures, exponential backoff retry logic

**Verification Flow**:
- `GET /captures/{id}/verify` → fetch capture metadata from DynamoDB → download S3 object → recompute SHA-256 → compare hashes → return verification result with chain of custody

**Reliability & Monitoring**:
- **DLQ Configuration**: Separate DLQs for API failures and capture failures
- **CloudWatch Metrics**: Capture latency, success rate, error types, queue depth
- **Alarms**: Error rate > 5%, DLQ depth > 0, capture latency p95 > 60s

**Security & Compliance**:
- CloudTrail with S3 data events enabled on artifacts bucket AND logs bucket
- KMS CMK encryption for all storage with customer-managed keys
- Least-privilege IAM roles per function with resource-specific permissions
- Presigned URLs with 15-minute TTL for downloads
- **CRITICAL**: S3 Object Lock in COMPLIANCE mode (not Governance)
- **MISSING**: Authentication system (Cognito integration), Secrets Manager setup

### Future Scheduling Architecture (Out of MVP Scope)
```
EventBridge Rule (cron) → Scheduler Lambda → Query DynamoDB for due schedules → Fan-out to Capture Lambdas → Results aggregation
```

---

## Data Models

### DynamoDB Table: `csa-captures`

**Primary Key Design**:
- **PK**: `USER#{user_id}` (enables user isolation and efficient querying)
- **SK**: `CAPTURE#{timestamp_iso}#{capture_id}` (natural sort order by timestamp)

**Attributes**:
```python
{
    "capture_id": "cap_01HDQ7...",        # ULID for globally unique, sortable IDs
    "user_id": "user_123",               # Extracted from JWT token
    "schedule_id": null,                 # Reserved for future scheduled captures
    "url": "https://example.com/policy", # Original URL captured
    "format": "pdf",                     # Artifact type: "pdf" | "png"
    "s3_key": "captures/2025/08/21/cap_01HDQ7....pdf",
    "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "timestamp": 1692636131,             # Unix epoch timestamp
    "status": "SUCCEEDED",               # "PENDING" | "SUCCEEDED" | "FAILED"
    "error": null,                       # Error message if status is FAILED
    "size_bytes": 1048576,               # Artifact size for monitoring
    "duration_ms": 3500,                 # Capture duration for performance metrics
    "retention_class": "standard",       # Retention policy class
    "tags": ["compliance", "quarterly"]  # Optional tags for categorization
}
```

**GSI1 (Browse by URL)**:
- **PK**: `URL#{sha256(url)}`
- **SK**: `TIMESTAMP#{timestamp_iso}`
- **Purpose**: List all captures for a specific URL in chronological order

**GSI2 (Browse by Date Range)**:
- **PK**: `DATE#{YYYY-MM-DD}`
- **SK**: `TIMESTAMP#{timestamp_iso}#{capture_id}`
- **Purpose**: Efficient date range queries for reporting

### S3 Object Structure

**Key Pattern**: `captures/{user_id}/{YYYY}/{MM}/{DD}/{capture_id}.{format}`

**Object Metadata**:
```json
{
    "x-amz-meta-sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "x-amz-meta-url": "https://example.com/policy",
    "x-amz-meta-timestamp": "2025-08-21T18:02:11Z",
    "x-amz-meta-capture-id": "cap_01HDQ7...",
    "x-amz-meta-user-id": "user_123"
}
```

---

## Security & Compliance

### S3 Bucket Configuration
- **Object Lock**: **COMPLIANCE mode** (NOT Governance) with 7-year default retention - CRITICAL for regulatory compliance
- **Versioning**: REQUIRED and enabled for Object Lock functionality
- **Encryption**: SSE-KMS with customer-managed CMK (aws:kms algorithm)
- **Lifecycle**: Transition to Glacier Instant Retrieval after 30 days
- **Block Public Access**: All settings enabled
- **Bucket Policy**: Enforce TLS-only, deny unencrypted uploads, pin to specific KMS key

**CRITICAL SECURITY REQUIREMENT**: The current infrastructure uses GOVERNANCE mode which allows privileged users to bypass retention policies. This MUST be changed to COMPLIANCE mode for regulatory compliance:

```terraform
# REQUIRED: Change from current GOVERNANCE to COMPLIANCE mode
resource "aws_s3_bucket_object_lock_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.bucket
  rule {
    default_retention {
      mode = "COMPLIANCE"  # MUST be COMPLIANCE for regulatory requirements
      days = 2557         # 7 years = 2557 days
    }
  }
}
```

### KMS CMK Policy (Least Privilege)
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCSAServices",
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "arn:aws:iam::ACCOUNT:role/csa-capture-lambda-role",
                    "arn:aws:iam::ACCOUNT:role/csa-api-lambda-role"
                ]
            },
            "Action": [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
                "kms:DescribeKey"
            ],
            "Resource": "*"
        }
    ]
}
```

### IAM Policies (Least Privilege)

**Capture Lambda Role**:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectMetadata"
            ],
            "Resource": "arn:aws:s3:::csa-artifacts-ACCOUNT/captures/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:UpdateItem"
            ],
            "Resource": "arn:aws:dynamodb:REGION:ACCOUNT:table/csa-captures"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kms:Encrypt",
                "kms:GenerateDataKey"
            ],
            "Resource": "arn:aws:kms:REGION:ACCOUNT:key/KEY-ID"
        }
    ]
}
```

### CloudTrail Configuration
- **S3 Data Events**: Enabled for artifacts bucket with read/write logging  
- **Management Events**: All regions, read/write operations
- **Log File Validation**: Enabled for integrity verification
- **Log Retention**: CloudTrail logs bucket MUST also have Object Lock (COMPLIANCE mode) enabled

**CRITICAL MISSING**: CloudTrail logs bucket lacks Object Lock configuration:

```terraform
# REQUIRED: Add Object Lock to CloudTrail logs bucket
resource "aws_s3_bucket_object_lock_configuration" "trail" {
  bucket = aws_s3_bucket.trail.bucket
  rule {
    default_retention {
      mode = "COMPLIANCE"  # Immutable audit logs
      days = 2557         # 7+ years retention
    }
  }
}

# REQUIRED: CloudTrail with S3 data events
resource "aws_cloudtrail" "main" {
  name                          = "${var.project}-compliance-trail"
  s3_bucket_name                = aws_s3_bucket.trail.id
  kms_key_id                    = aws_kms_key.cloudtrail.arn
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true
    
    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.artifacts.arn}/*"]  # Audit ALL object access
    }
  }
}
```

---

## Implementation Blueprint

### File Structure & Components

```
app/
├── api/
│   ├── routes/
│   │   ├── captures.py         # Capture endpoints implementation
│   │   └── health.py           # Health check endpoint
│   └── deps.py                 # FastAPI dependencies (auth, validation)
├── capture_engine/
│   ├── handler.py              # Lambda entry point for captures
│   ├── playwright_engine.py    # PDF generation with deterministic settings
│   └── Dockerfile              # Container image for Lambda
├── storage/
│   ├── s3_client.py            # S3 operations with KMS and metadata
│   ├── dynamo_client.py        # DynamoDB operations with error handling
│   └── hash_utils.py           # SHA-256 computation utilities
├── domain/
│   ├── models.py               # Pydantic models for API contracts
│   └── exceptions.py           # Custom exception classes
└── core/
    ├── config.py               # Environment-based configuration
    ├── logging.py              # Structured JSON logging
    └── auth.py                 # JWT validation and user extraction
```

### Core Implementation Pseudocode

**1. Capture Trigger Endpoint** (`app/api/routes/captures.py`):
```python
@router.post("/trigger", response_model=CaptureOut)
async def trigger_capture(
    request: TriggerCaptureRequest,
    user: dict = Depends(get_current_user)
) -> CaptureOut:
    # Validate URL and parameters
    # Generate unique capture_id (ULID)
    # Create pending DynamoDB record
    # Invoke capture Lambda asynchronously
    # Return capture metadata
```

**2. Capture Engine** (`app/capture_engine/playwright_engine.py`):
```python
# Deterministic Playwright Configuration for Compliance Evidence
PLAYWRIGHT_CONFIG = {
    "headless": True,
    "args": [
        "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
        "--disable-gpu", "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding", "--disable-extensions",
        "--mute-audio", "--no-first-run", "--disable-sync"
    ],
    "viewport": {"width": 1920, "height": 1080},
    "device_scale_factor": 1.0,
    "locale": "en-US",
    "timezone_id": "UTC",
    "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ComplianceArchiver/1.0"
}

PDF_CONFIG = {
    "format": "A4",
    "print_background": True,
    "prefer_css_page_size": False,
    "display_header_footer": True,
    "header_template": '<div style="font-size:10px;text-align:center;">Compliance Archive - {{ timestamp }}</div>',
    "footer_template": '<div style="font-size:10px;text-align:center;">URL: {{ url }} | Hash: {{ hash_preview }}</div>',
    "margin": {"top": "0.75in", "bottom": "0.75in", "left": "0.5in", "right": "0.5in"},
    "scale": 1.0
}

async def capture_page_to_pdf(url: str, capture_id: str, user_id: str) -> bytes:
    from playwright.async_api import async_playwright
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(**PLAYWRIGHT_CONFIG)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Multi-phase wait strategy for compliance captures
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)  # JS execution time
        await page.wait_for_load_state("networkidle", timeout=10000)
        await page.wait_for_timeout(1000)  # Final stabilization
        
        # Generate PDF with tamper-evident properties
        pdf_bytes = await page.pdf(**PDF_CONFIG)
        
        await browser.close()
        return pdf_bytes
```

**3. S3 Storage with Metadata** (`app/storage/s3_client.py`):
```python
def store_artifact(
    pdf_bytes: bytes, 
    s3_key: str, 
    metadata: dict,
    kms_key_id: str
) -> str:
    # Compute SHA-256 hash
    sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
    
    # Prepare S3 metadata
    s3_metadata = {
        'sha256': sha256_hash,
        'url': metadata['url'],
        'timestamp': metadata['timestamp'],
        'capture-id': metadata['capture_id']
    }
    
    # Put object with SSE-KMS and metadata
    s3_client.put_object(
        Bucket=ARTIFACTS_BUCKET,
        Key=s3_key,
        Body=pdf_bytes,
        ContentType='application/pdf',
        ServerSideEncryption='aws:kms',
        SSEKMSKeyId=kms_key_id,
        Metadata=s3_metadata
    )
    
    return sha256_hash
```

**4. Verification Endpoint** (`app/api/routes/captures.py`):
```python
@router.get("/{capture_id}/verify")
async def verify_capture(capture_id: str) -> VerificationResult:
    # Fetch capture metadata from DynamoDB
    capture = await dynamo_client.get_capture(capture_id)
    
    # Download artifact from S3
    s3_object = s3_client.get_object(Bucket=bucket, Key=capture.s3_key)
    artifact_bytes = s3_object['Body'].read()
    
    # Recompute hash
    computed_hash = hashlib.sha256(artifact_bytes).hexdigest()
    
    # Compare with stored hash
    matches = computed_hash == capture.sha256
    
    return VerificationResult(
        ok=True,
        sha256_matches=matches,
        expected=capture.sha256,
        computed=computed_hash
    )
```

### Error Handling Strategy

**Capture Pipeline Errors**:
- Network timeouts → Retry with exponential backoff (max 3 attempts)
- Page load failures → Record error in DynamoDB with status "FAILED"
- S3 upload failures → Use DLQ for retry processing
- Browser crashes → Lambda timeout protection and error logging

**API Error Responses**:
```python
{
    "error": {
        "code": "CAPTURE_FAILED",
        "message": "Page failed to load within timeout",
        "details": {
            "url": "https://example.com/policy",
            "timeout_ms": 30000,
            "error_type": "TimeoutError"
        }
    }
}
```

---

## External References

### FastAPI Patterns & Best Practices
- **Dependency Injection**: https://fastapi.tiangolo.com/tutorial/dependencies/
- **Request/Response Models**: https://fastapi.tiangolo.com/tutorial/body/
- **Background Tasks**: https://fastapi.tiangolo.com/tutorial/background-tasks/
- **FastAPI Best Practices 2025**: https://github.com/zhanymkanov/fastapi-best-practices

### Playwright PDF Generation
- **PDF Generation Guide**: https://www.checklyhq.com/learn/playwright/generating-pdfs/
- **Playwright Python Documentation**: https://playwright.dev/python/docs/library
- **Deterministic Settings**: https://playwright.dev/docs/best-practices
- **Wait Strategies**: https://playwright.dev/python/docs/actionability

### AWS Services Implementation
- **S3 Object Lock**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- **boto3 put_object**: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_object.html
- **S3 SSE-KMS**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- **DynamoDB Key Design**: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- **CloudTrail Data Events**: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html

### Testing with Moto
- **Moto Documentation**: http://docs.getmoto.org/
- **AWS Lambda Testing**: https://aws.amazon.com/blogs/devops/unit-testing-aws-lambda-with-python-and-mock-aws-services/
- **DynamoDB Testing**: https://medium.com/responsetap-engineering/better-than-mocking-boto-dynamodb-unit-tests-with-moto-687b0e58f006
- **S3 Mock Testing**: https://caylent.com/blog/mocking-aws-calls-using-moto

---

## Validation Gates (Executable)

### Code Quality Gates
```bash
# Lint and format (MUST pass before commit)
uv run ruff check .
uv run ruff format --check .

# Type checking (MUST pass before commit)
uv run mypy app/

# Security scanning
uv run bandit -c pyproject.toml -r app

# All quality checks together
uv run ruff check . && uv run ruff format --check . && uv run mypy app/ && uv run bandit -c pyproject.toml -r app
```

### Test Execution
```bash
# Unit tests with coverage
uv run pytest tests/ -v --cov=app --cov-report=html

# Integration tests (moto mocks)
uv run pytest tests/integration/ -v

# Quick test run
uv run pytest -q
```

### Infrastructure Validation
```bash
# Terraform quality checks
terraform -chdir=infra fmt -check
terraform -chdir=infra validate
terraform -chdir=infra plan

# Security policy checks
checkov -d infra --framework terraform
```

### E2E Smoke Test (Mocked Backends)
```bash
# Test script that validates complete flow:
python tests/e2e/smoke_test.py
```

**Smoke Test Flow**:
1. `POST /api/captures/trigger` with test URL → Returns capture_id
2. Mock Playwright generates deterministic PDF bytes
3. Verify SHA-256 computation → Store in mocked S3 with metadata
4. Write DynamoDB record with correct partition/sort keys
5. `GET /captures/{id}` → Returns complete metadata
6. `GET /captures/{id}/verify` → Returns `{ ok: true, sha256_matches: true }`
7. `GET /captures/{id}/download` → Returns presigned URL (mock)

---

## Missing Critical Infrastructure Components

**CRITICAL GAPS REQUIRING IMMEDIATE ATTENTION**:

### 1. Authentication Infrastructure (MISSING)
```terraform
# REQUIRED: Cognito User Pool for authentication
resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-users"
  
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  mfa_configuration = "ON"
  
  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project}-client"
  user_pool_id = aws_cognito_user_pool.main.id
  
  generate_secret                      = false
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  
  supported_identity_providers = ["COGNITO"]
}
```

### 2. Lambda IAM Roles (MISSING)
```terraform
# REQUIRED: IAM roles for Lambda functions
resource "aws_iam_role" "api_lambda_role" {
  name = "${var.project}-api-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role" "capture_lambda_role" {
  name = "${var.project}-capture-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Least-privilege policies for capture Lambda
resource "aws_iam_role_policy" "capture_lambda_policy" {
  name = "${var.project}-capture-lambda-policy"
  role = aws_iam_role.capture_lambda_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectMetadata"
        ]
        Resource = "${aws_s3_bucket.artifacts.arn}/captures/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.captures.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.artifacts.arn
      }
    ]
  })
}
```

### 3. DLQ Infrastructure (MISSING)
```terraform
# REQUIRED: Dead Letter Queues for reliability
resource "aws_sqs_queue" "capture_dlq" {
  name                      = "${var.project}-capture-dlq"
  message_retention_seconds = 1209600  # 14 days
  
  kms_master_key_id = aws_kms_key.artifacts.arn
}

resource "aws_sqs_queue" "api_dlq" {
  name                      = "${var.project}-api-dlq"
  message_retention_seconds = 1209600
  
  kms_master_key_id = aws_kms_key.artifacts.arn
}
```

### 4. Lambda Container Configuration (MISSING)
```terraform
# REQUIRED: ECR repository for capture Lambda container
resource "aws_ecr_repository" "capture_lambda" {
  name = "${var.project}-capture-lambda"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

# REQUIRED: Capture Lambda function
resource "aws_lambda_function" "capture" {
  function_name = "${var.project}-capture"
  role         = aws_iam_role.capture_lambda_role.arn
  
  package_type = "Image"
  image_uri    = "${aws_ecr_repository.capture_lambda.repository_url}:latest"
  
  memory_size = 2048  # Required for Chromium
  timeout     = 300   # 5 minutes
  
  environment {
    variables = {
      S3_BUCKET_ARTIFACTS = aws_s3_bucket.artifacts.bucket
      KMS_KEY_ID         = aws_kms_key.artifacts.arn
      DYNAMODB_TABLE     = aws_dynamodb_table.captures.name
    }
  }
  
  dead_letter_config {
    target_arn = aws_sqs_queue.capture_dlq.arn
  }
}
```

### 5. API Gateway Integration (INCOMPLETE)
```terraform
# REQUIRED: API Gateway with Cognito authorizer
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project}-api"
  description = "Compliance Screenshot Archiver API"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_authorizer" "cognito" {
  name                   = "${var.project}-cognito-authorizer"
  rest_api_id           = aws_api_gateway_rest_api.main.id
  type                  = "COGNITO_USER_POOLS"
  provider_arns         = [aws_cognito_user_pool.main.arn]
  identity_source       = "method.request.header.Authorization"
}
```

---

## Tasks in Order (Implementation Sequence)

### Phase 1: Foundation (Days 1-2)
1. **Setup capture engine infrastructure**
   - Create Dockerfile for Playwright + Chromium
   - Implement deterministic PDF generation
   - Add SHA-256 hash computation utilities

2. **Implement core data models**
   - Define Pydantic models for API contracts
   - Create DynamoDB table schemas with correct keys
   - Add S3 client with KMS and metadata support

### Phase 2: API Layer (Days 2-3)  
1. **Build capture endpoints**
   - `POST /captures/trigger` with validation
   - Lambda integration for async capture processing
   - Error handling and status tracking

2. **Implement verification system**
   - `GET /captures/{id}` metadata endpoint
   - `GET /captures/{id}/verify` hash verification
   - `GET /captures/{id}/download` presigned URLs

### Phase 3: Security & Compliance (Days 3-4)
1. **Configure security infrastructure**
   - S3 bucket with Object Lock (Compliance mode)
   - KMS CMK with least-privilege key policy
   - CloudTrail with S3 data events enabled

2. **Implement authentication & authorization**
   - JWT validation with Cognito integration
   - User extraction and data isolation
   - Rate limiting and idempotency keys

### Phase 4: Testing & Validation (Days 4-5)
1. **Create comprehensive test suite**
   - Unit tests with moto for AWS services
   - Integration tests for complete workflows
   - E2E smoke tests with deterministic scenarios

2. **Add observability**
   - Structured JSON logging with correlation IDs
   - CloudWatch metrics for key operations
   - Alarms for error rates and performance

### Phase 5: UI & Final Integration (Days 5-6)
1. **Build basic web interface**
   - React components with shadcn/ui
   - Capture listing and detail views
   - Verify button with hash validation

2. **Production readiness**
    - Terraform infrastructure deployment
    - CI/CD pipeline with validation gates
    - Documentation and runbooks

---

## Definition of Done

### Technical Requirements
- [ ] All validation gates pass (`ruff`, `mypy`, `pytest`, `bandit`)
- [ ] S3 Object Lock (Compliance mode) enabled and verified
- [ ] KMS encryption working with least-privilege policies
- [ ] CloudTrail S3 data events enabled and tested
- [ ] API endpoints return correct status codes and error messages
- [ ] SHA-256 verification endpoint returns accurate results
- [ ] Presigned URLs have TTL ≤ 15 minutes

### Security & Compliance
- [ ] No secrets or credentials in code/logs/artifacts
- [ ] IAM roles follow least-privilege principle
- [ ] All S3 operations use SSE-KMS encryption
- [ ] DynamoDB partition keys provide proper user isolation
- [ ] JWT authentication enforced on all protected endpoints

### Testing Coverage
- [ ] Unit test coverage ≥ 90% for core business logic
- [ ] Integration tests cover S3 + DynamoDB + Lambda interactions
- [ ] E2E smoke test validates complete capture → verify workflow
- [ ] Moto mocks accurately simulate AWS service behavior

### Documentation & Operations
- [ ] API documentation updated with new endpoints
- [ ] Runbook procedures for common failures documented
- [ ] Terraform changes reviewed and applied safely
- [ ] Rollback plan tested and documented

---

## Rollback Plan

### Infrastructure Rollback
```bash
# Revert to previous Terraform state
terraform -chdir=infra workspace select prod
terraform -chdir=infra apply -target=aws_s3_bucket.artifacts terraform.tfstate.backup

# Disable new API routes via feature flags
aws apigateway update-stage --rest-api-id API_ID --stage-name prod --patch-ops op=replace,path=/variables/CAPTURE_ENABLED,value=false
```

### Application Rollback
- **Lambda Functions**: Revert alias traffic to previous version
- **API Gateway**: Update stage variables to disable new routes
- **Frontend**: Deploy previous static build to S3/CloudFront

### Data Safety
- **S3 Objects**: Protected by Object Lock (cannot be deleted)
- **DynamoDB**: Point-in-time recovery available
- **Incremental Changes**: New captures marked with version metadata

### Monitoring During Rollback
- Monitor error rates and latency during traffic shift
- Verify S3 Object Lock remains enabled
- Confirm CloudTrail logging continues uninterrupted
- Check KMS key accessibility for existing objects

---

## Evidence Bundle Structure

For audit purposes, the system generates evidence bundles containing:

```
evidence_bundle_YYYY-MM-DD.zip
├── manifest.json                 # List of captures with metadata
├── captures/
│   ├── cap_01HDQ7....pdf        # Original artifacts
│   └── cap_01HDQ8....pdf
├── metadata/
│   ├── cap_01HDQ7....json       # DynamoDB records
│   └── cap_01HDQ8....json
├── verification/
│   ├── hashes.txt               # SHA-256 values for verification
│   └── verify.py                # Script to recompute and verify hashes
├── audit_trail/
│   └── cloudtrail_events.json   # Relevant S3 data events
└── README.txt                   # Instructions for auditors
```

---

## CRITICAL COMPLIANCE SUMMARY

**BEFORE IMPLEMENTATION: Address Critical Security Gaps**

The current codebase has **CRITICAL SECURITY VIOLATIONS** that MUST be fixed before deployment:

### **IMMEDIATE BLOCKERS**
1. **S3 Object Lock Mode**: Currently GOVERNANCE - MUST change to **COMPLIANCE mode** for regulatory compliance
2. **Missing Authentication**: No Cognito User Pool or JWT validation implemented 
3. **Missing IAM Roles**: Lambda functions lack proper execution roles and policies
4. **CloudTrail Gaps**: Logs bucket lacks Object Lock, incomplete S3 data events
5. **No DLQ Infrastructure**: Missing reliability and error handling mechanisms

### **COMPLIANCE CHECKLIST** 
- [ ] S3 Object Lock: **COMPLIANCE mode** (7+ year retention)
- [ ] CloudTrail: S3 data events + Object Lock on logs bucket  
- [ ] KMS: Customer-managed CMK with least-privilege policies
- [ ] Authentication: Cognito User Pool + JWT validation
- [ ] IAM: Least-privilege roles for all Lambda functions
- [ ] DLQ: Dead letter queues for capture and API failures
- [ ] Container: Playwright Lambda with deterministic settings
- [ ] Hashing: SHA-256 + optional HMAC for integrity verification
- [ ] Monitoring: CloudWatch metrics, alarms, structured logging

### **REGULATORY REQUIREMENTS MET**
✅ **WORM Storage**: S3 Object Lock (Compliance mode)  
✅ **Cryptographic Integrity**: SHA-256 hashing with verification  
✅ **Audit Trail**: CloudTrail S3 data events + immutable logs  
✅ **Access Control**: JWT + RBAC + least-privilege IAM  
✅ **Evidence Bundles**: Exportable with verification scripts  
✅ **Retention**: 7+ year configurable retention policies  
✅ **Tamper Evidence**: PDF headers/footers + metadata chains  

### **SUCCESS CRITERIA**
- Captures produce court-admissible evidence with cryptographic integrity
- Complete immutability through S3 Object Lock (Compliance mode)
- Full audit trail via CloudTrail with immutable logs
- Verification endpoint confirms artifact integrity
- Evidence bundles support regulatory submissions

This comprehensive PRP provides everything needed for a one-pass implementation by an AI agent, with complete context, specific patterns to follow, executable validation gates, and clear success criteria tied to compliance evidence generation and WORM storage requirements.