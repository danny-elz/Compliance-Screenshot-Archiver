# CSA Validation Gates

## Purpose
This document defines automated validation rules that must pass before any code changes are accepted. These gates ensure compliance with CSA specifications, security requirements, and architectural decisions.

## Agent Context
You are a validation agent for the Compliance Screenshot Archiver (CSA) project. Your role is to:
1. Enforce compliance with security requirements (Object Lock, SSE-KMS, audit logging)
2. Validate adherence to MoSCoW requirements documented in CSA-Spec.md
3. Ensure code follows the architecture defined in CSA-Design.md
4. Verify critical paths maintain idempotency and determinism
5. Block any changes that could compromise regulatory compliance

## Critical Validation Rules

### 1. Security & Compliance Gates

#### S3 Object Lock Validation
**CRITICAL**: Any changes to S3 configuration must maintain:
-wi
- Minimum 7-year retention (2557 days)
- Versioning MUST remain enabled
- SSE-KMS encryption with CMK required

**Validation Command**:
```bash
terraform plan -detailed-exitcode | grep -E "object_lock|retention|versioning|encryption" || exit 0
# If changes detected, verify COMPLIANCE mode is maintained
```

#### IAM Least Privilege
**Rule**: Lambda functions must have minimal required permissions
- No wildcard (*) resources except for CloudWatch logs
- No admin or power user policies
- Separate roles per Lambda function

**Validation**:
```python
# Check for overly permissive IAM policies
def validate_iam_policies():
    forbidden_actions = ["*", "iam:*", "s3:*", "dynamodb:*"]
    forbidden_resources = ["*"] # except for logs
    # Fail if detected in non-log policies
```

#### Secrets Management
**Rule**: No hardcoded credentials or sensitive data
- API keys must use Secrets Manager
- No auth tokens in code or logs
- No cookies/headers in captured artifacts

**Validation**:
```bash
# Scan for hardcoded secrets
ruff check --select S105,S106,S107 app/
grep -r "password\|api_key\|secret\|token" --include="*.py" app/ | grep -v "get_secret"
```

### 2. Data Integrity Gates

#### Hash Validation
**Rule**: SHA-256 hashes MUST be computed and stored for all captures
- Hash computation must occur before S3 upload
- Hash must be stored in both DynamoDB and S3 metadata
- Hash verification endpoint must recompute from source

**Validation**:
```python
# Verify hash computation in capture flow
def validate_hash_implementation():
    assert "hashlib.sha256" in capture_code
    assert hash_stored_in_dynamodb
    assert hash_in_s3_metadata
```

#### Idempotency Requirements
**Rule**: Capture operations must be idempotent
- Duplicate capture requests must not create duplicate artifacts
- Use capture_id as idempotency key
- Check existence before processing

**Validation**:
```python
# Check idempotency implementation
def validate_idempotency():
    assert capture_checks_existing_id
    assert no_duplicate_s3_uploads
```

### 3. Capture Engine Gates

#### Playwright Configuration
**Rule**: Browser must use deterministic settings
- Disable animations and transitions
- Fixed viewport sizes
- Consistent user agent
- No randomization in capture process

**Validation**:
```python
# Verify deterministic browser settings
REQUIRED_SETTINGS = {
    "animations": "disabled",
    "viewport": {"width": 1920, "height": 1080},
    "user_agent": "CSA-Bot/1.0",
    "timezone": "UTC"
}
```

#### Memory & Timeout Limits
**Rule**: Lambda configurations must match requirements
- CaptureLambda: 2048MB RAM, 60s timeout
- SchedulerLambda: 512MB RAM, 15s timeout
- APILambda: 1024MB RAM, 30s timeout

**Validation**:
```bash
# Check Lambda configurations in Terraform
terraform validate
terraform plan | grep -A5 "memory_size\|timeout"
```

### 4. API & Authentication Gates

#### Cognito Integration
**Rule**: All API endpoints must validate JWT tokens
- Except /health endpoint
- Token must contain user_id claim
- Rate limiting required on /api/captures/trigger

**Validation**:
```python
# Verify auth decorators on endpoints
def validate_api_auth():
    for endpoint in api_endpoints:
        if endpoint != "/health":
            assert has_auth_decorator(endpoint)
```

#### Rate Limiting
**Rule**: On-demand captures must be rate limited
- Max 10 captures per minute per user
- Implement exponential backoff on throttle
- Return 429 status when limit exceeded

### 5. Scheduling & Reliability Gates

#### EventBridge Configuration
**Rule**: Scheduler must have proper error handling
- DLQ configured for all async operations
- Retry policy: 2 attempts with exponential backoff
- CloudWatch alarms for DLQ depth > 10

**Validation**:
```bash
# Verify EventBridge and DLQ setup
aws events describe-rule --name CSA-Scheduler
aws sqs get-queue-attributes --queue-url $DLQ_URL --attribute-names All
```

#### Cron Expression Validation
**Rule**: All cron expressions must be valid
- Support standard cron format
- Timezone must be IANA format
- Validate before storing in DynamoDB

### 6. Testing Gates

#### Required Test Coverage
**Rule**: Critical paths must have tests
- Capture flow: > 80% coverage
- Hash computation: 100% coverage
- API auth: 100% coverage
- S3 operations: Integration tests required

**Validation**:
```bash
# Run tests with coverage
uv run pytest --cov=app --cov-report=term-missing
# Fail if coverage < 80% for critical modules
```

#### Security Tests
**Rule**: Security-specific tests required
- Test Object Lock cannot be disabled
- Test unauthorized API access blocked
- Test secrets not logged
- Test hash verification catches tampering

### 7. Terraform & Infrastructure Gates

#### Plan Review
**Rule**: Terraform changes require explicit review
- No destruction of Object Lock buckets
- No reduction in retention periods
- No removal of encryption
- No weakening of IAM policies

**Validation**:
```bash
# Terraform plan must not show destructive changes
terraform plan -detailed-exitcode
# Exit code 2 means changes, require review
```

#### CloudTrail Audit
**Rule**: Audit logging must remain enabled
- CloudTrail must log S3 data events
- Trail must write to Object Lock bucket
- KMS encryption required on trail

### 8. Code Quality Gates

#### Python Linting
**Validation**:
```bash
# Run all linters
uv run ruff check app/
uv run mypy app/
uv run black --check app/
```

#### Security Scanning
**Validation**:
```bash
# Scan for vulnerabilities
uv run bandit -r app/
uv run safety check
```

## Automated Validation Script

Create `.github/workflows/validation-gates.yml`:

```yaml
name: CSA Validation Gates

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  security-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check for hardcoded secrets
        run: |
          ! grep -r "password\|api_key\|secret\|token" --include="*.py" app/ | grep -v "get_secret\|Secret"
      
      - name: Validate IAM policies
        run: |
          ! grep -r '"Resource": "\*"' infra/*.tf | grep -v "logs:"
      
      - name: Check Object Lock configuration
        run: |
          grep -q 'mode = "COMPLIANCE"' infra/s3_artifacts.tf
          grep -q 'days = 2557' infra/s3_artifacts.tf

  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Install uv
        run: pip install uv
      
      - name: Install dependencies
        run: uv sync
      
      - name: Run linters
        run: |
          uv run ruff check app/
          uv run mypy app/
      
      - name: Run tests
        run: |
          uv run pytest --cov=app --cov-fail-under=60

  terraform-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Init
        run: terraform -chdir=infra init -backend=false
      
      - name: Terraform Validate
        run: terraform -chdir=infra validate
      
      - name: Check for destructive changes
        run: |
          terraform -chdir=infra plan -detailed-exitcode || true
          # Manual review required for any changes
```

## Manual Review Triggers

These conditions ALWAYS require human review:
1. Any change to S3 Object Lock configuration
2. Any change to retention periods
3. Any change to KMS key policies
4. Any change to CloudTrail configuration
5. Any change to IAM role trust policies
6. Any change to Cognito user pool settings
7. Any deletion of resources
8. Any change to validation-gates.md itself

## Enforcement

**CRITICAL**: These validation gates are non-negotiable for regulatory compliance. Any attempt to bypass or weaken these gates should be:
1. Immediately flagged as a security incident
2. Require executive approval
3. Be documented in audit logs
4. Trigger a compliance review

## Gate Evolution

New gates should be added when:
- New compliance requirements are identified
- Security vulnerabilities are discovered
- Architectural decisions change
- Lessons learned from incidents

Gates should NEVER be removed without:
- Legal/compliance team approval
- Documentation of why the gate is no longer needed
- Verification that no regulatory requirement is violated