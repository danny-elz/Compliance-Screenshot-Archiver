# Task Completion Checklist

## Before Completing Any Task

### Code Quality Gates (MANDATORY)
- [ ] All validation commands pass:
  - [ ] `uv run ruff check .` (linting)
  - [ ] `uv run ruff format --check .` (formatting)  
  - [ ] `uv run mypy src/` (type checking)
  - [ ] `uv run pytest -q` (tests)
- [ ] Pre-commit hooks pass
- [ ] No secrets or credentials in code/logs
- [ ] Files are ≤ 500 LOC (refactor if exceeding)

### Testing Requirements
- [ ] Unit tests added for new functions/classes
- [ ] At least 3 test cases: expected, edge case, failure case
- [ ] Integration tests use moto for AWS services
- [ ] API tests validate request/response schemas
- [ ] Security tests ensure JWT validation and RBAC

### Documentation Updates
- [ ] Update `README.md` if setup/features changed
- [ ] Update API documentation (`docs/openapi.yaml`)
- [ ] Add/update docstrings (Google style)
- [ ] Update runbooks if operational procedures changed

### Security Compliance Checks
- [ ] S3 Object Lock (Compliance mode) not bypassed
- [ ] KMS encryption properly configured
- [ ] CloudTrail S3 data events enabled
- [ ] IAM follows least-privilege principle
- [ ] JWT authentication enforced on protected routes
- [ ] Presigned URLs have TTL ≤ 15 minutes
- [ ] No PII or secrets logged

### Infrastructure Checks (if Terraform changed)
- [ ] `terraform fmt -check` passes
- [ ] `terraform validate` passes  
- [ ] `terraform plan` reviewed
- [ ] Security scans pass (checkov/tfsec)
- [ ] Object Lock compliance verified in plan

### Architecture Compliance
- [ ] Follows CSA architecture: API Gateway → FastAPI → EventBridge → Capture Lambda → S3 + DynamoDB
- [ ] Capture engine uses Playwright/Chromium deterministically
- [ ] SHA-256 hashing implemented for all artifacts
- [ ] DynamoDB uses correct partition/sort keys
- [ ] Error handling includes retries and DLQ

## Task Completion Steps
1. [ ] Update `TASK.md` with completion status
2. [ ] Add any "Discovered During Work" sub-tasks
3. [ ] Run final validation: `uv run ruff check . && uv run mypy src/ && uv run pytest -q`
4. [ ] Commit changes with semantic commit message
5. [ ] Create PR with compliance checklist in description

## Release Readiness (for major changes)
- [ ] E2E smoke tests pass
- [ ] Performance benchmarks within targets (p95 ≤ 60s captures)
- [ ] Cost projections within guardrails (<$2,000/month)
- [ ] Observability dashboards and alarms configured
- [ ] Rollback plan documented and tested
- [ ] Evidence bundle generation verified

## Never Do These Things
- [ ] Disable Object Lock or KMS encryption
- [ ] Store secrets/credentials in artifacts or logs
- [ ] Bypass validation gates to merge faster
- [ ] Grant overly broad IAM permissions (`*:*`)
- [ ] Remove CloudTrail S3 data events
- [ ] Use public S3 ACLs for artifacts