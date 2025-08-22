# Pull Request Checklist

## Overview
**What does this PR do?**
<!-- Brief description of changes -->

**Which TASK.md items does this address?**
<!-- List specific tasks from TASK.md that this PR completes or progresses -->

## TASK.md Sync (REQUIRED)
- [ ] **I have updated TASK.md to reflect completed work**
- [ ] **Checked off completed acceptance criteria items**
- [ ] **Updated task status** (PENDING → IN_PROGRESS → COMPLETED)
- [ ] **Added completion date and PR reference** (e.g., "Completed 2024-01-22, PR #45")

> ⚠️ **PR will be blocked if TASK.md is not updated for feature/infrastructure changes**

## Code Quality
- [ ] Code follows project conventions
- [ ] Tests added/updated for new functionality
- [ ] All linting checks pass (`uv run ruff check`)
- [ ] Type checking passes (`uv run mypy`)
- [ ] No hardcoded secrets or credentials

## Security & Compliance
- [ ] Changes maintain S3 Object Lock COMPLIANCE mode
- [ ] IAM permissions follow least privilege principle
- [ ] Secrets managed via AWS Secrets Manager
- [ ] CloudTrail logging remains enabled
- [ ] No reduction in retention periods

## Testing
- [ ] All tests pass (`uv run pytest`)
- [ ] Integration tests added for new features
- [ ] Security-related changes have specific tests
- [ ] Manual testing completed

## Infrastructure (if applicable)
- [ ] Terraform plan reviewed and approved
- [ ] No destructive changes to production resources
- [ ] KMS encryption settings preserved
- [ ] CloudWatch alarms configured for new resources

## Documentation
- [ ] API documentation updated (if API changes)
- [ ] README updated (if setup/usage changes)
- [ ] Inline code comments added for complex logic

## Reviewer Instructions
**For reviewers: Please verify TASK.md has been properly updated before approving.**

### TASK.md Review Checklist:
- [ ] Completed tasks marked as COMPLETED
- [ ] Acceptance criteria properly checked off
- [ ] Status progression makes sense (PENDING → IN_PROGRESS → COMPLETED)
- [ ] Completion date and PR reference added
- [ ] Any new discovered tasks added to backlog

## Deployment Notes
**Any special deployment considerations?**
<!-- Infrastructure changes, environment variables, etc. -->

---

## For Maintainers

### Auto-generated TASK.md Validation
This section is populated by CI/CD:

```
TASK.md Change Detection: [PASS/FAIL]
Code Changes Detected: [YES/NO]
Task Status Updates Found: [YES/NO]
```

<!-- 
## TASK.md Update Examples

### ✅ Good Example:
```diff
### Task: Implement CaptureLambda
**Priority**: MUST  
- **Status**: IN_PROGRESS → COMPLETED ✅
+ **Completed**: 2024-01-22, PR #45
**Acceptance Criteria**:
- [x] Container image with Playwright + Chromium built
- [x] SHA-256 hash computation implemented
- [x] S3 upload with metadata working
```

### ❌ Bad Example:
```diff
// No changes to TASK.md despite implementing CaptureLambda
```
-->