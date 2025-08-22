name: "<Feature>: CSA"
description: |
  Implement <Feature> for Compliance Screenshot Archiver.

## Purpose
Automated, tamper-evident capture + retention aligned with CSA spec. :contentReference[oaicite:23]{index=23}

## Success Criteria (checklist)
- [ ] Meets MoSCoW "M" items relevant to this feature (spec).
- [ ] Hash (SHA-256) computed & persisted; verify API returns OK. :contentReference[oaicite:24]{index=24}
- [ ] S3 interaction respects Object Lock + SSE-KMS. :contentReference[oaicite:25]{index=25}
- [ ] EventBridge/Scheduler semantics retained; retries/DLQ/backoff wired. :contentReference[oaicite:26]{index=26}
- [ ] Logs/metrics/traces present; CloudTrail S3 data events intact.

## All Needed Context
- file: docs/CSA-Spec.md      # CSA-SPEC v1.0
- file: docs/CSA-Design.md    # CSA-DESIGN v1.0
- file: README.md
- file: CLAUDE.md

## Architecture Impact
API Gateway + FastAPI → Scheduler (EventBridge) → Capture Lambda (Playwright) → S3 (Object Lock) + DynamoDB metadata. :contentReference[oaicite:27]{index=27}

## Data Models
- Schedule { scheduleId, userId, url, cron, tz, retentionClass, active, lastRun }
- Capture { captureId, scheduleId?, userId, url, ts, s3Key, fileType, sha256, status, error? } :contentReference[oaicite:28]{index=28}

## Validation Gates
```bash
uv run ruff check . && uv run ruff format --check .
uv run mypy src/
uv run pytest -q
# E2E: trigger → PDF → hash → S3 mock → DynamoDB mock → GET /captures/{id}/verify == OK
