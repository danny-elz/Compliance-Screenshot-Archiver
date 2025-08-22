# INITIAL.md — Compliance Screenshot Archiver (CSA)
**Feature:** MVP Vertical Slice — **On‑Demand PDF Capture → SHA‑256 → S3 (Object Lock) + DynamoDB → Verify Endpoint + Basic UI listing**

---

## 1) Purpose & Why (Compliance + WORM)
Organizations need immutable, verifiable evidence of what a web page looked like at a specific time for audits, regulatory reviews, or dispute resolution. This feature delivers a minimal, end‑to‑end slice that produces a **PDF artifact**, computes a **SHA‑256** integrity hash, stores it in **WORM** storage (S3 **Object Lock – Compliance mode**), records metadata in **DynamoDB**, and exposes verification via API. This establishes integrity, immutability, and auditability — the core pillars of compliance evidence.

---

## 2) Scope (In / Out)
**In scope**
- REST endpoint to **trigger on‑demand capture** of a given URL (PDF first; PNG optional later).
- Lambda container (Playwright/Chromium) to render PDF with deterministic settings.
- Compute **SHA‑256** for every artifact; persist hash in DDB and S3 object metadata.
- Store artifact in **S3 with Object Lock (Compliance mode)**, SSE‑KMS encryption, versioning.
- Record capture metadata in `csa-captures` DDB table.
- **GET /captures/{id}**, **GET /captures/{id}/verify**, **GET /captures/{id}/download** endpoints.
- Minimal **/captures** UI list and “Verify hash” action (React + shadcn/ui).
- Basic observability: structured logs + metrics; alarms for critical failures.

**Out of scope (for this slice)**
- Scheduled captures (EventBridge); multi‑tenant org RBAC beyond user scoping.
- Visual diffs, crawling, WARC, or watermarking.
- Advanced dashboard analytics; admin backoffice.
- Non‑AWS clouds.

---

## 3) User Stories
- **Compliance Officer**: “I can request a capture of `https://example.com/policy`, obtain a PDF stored immutably, and verify its integrity later.”
- **Auditor**: “Given a capture ID, I can see the metadata and verify the artifact’s SHA‑256 matches what was recorded at capture time.”
- **Ops**: “If capture fails, I receive logs/metrics to troubleshoot; retries & DLQ exist for resilience.”

---

## 4) Architecture (Slice)
**Path:** Client → API Gateway → FastAPI (Lambda) → invoke **Capture Lambda (container + Playwright)** → PDF → **S3 (Object Lock)** + **DynamoDB** → Verify via API.  
- **API Layer**: API Gateway REST + Lambda (FastAPI) for routes.
- **Capture**: Lambda container image (Python + Playwright + Headless Chromium).
- **Storage**: S3 bucket `csa-artifacts-<env>` with **Object Lock (Compliance)**, versioning, lifecycle to Glacier; SSE‑KMS (CMK).
- **Metadata**: DDB `csa-captures` with access patterns for by‑id and by‑user queries.
- **Audit**: CloudTrail **S3 data events**, Lambda logs/metrics, alarms.
- **(Future)**: EventBridge scheduler + `csa-schedules` table.

---

## 5) API Contracts
### Auth & Tenant Scoping (applies to all endpoints)
- All routes require **Authorization: Bearer <JWT>** issued by **Amazon Cognito**.
- The backend derives `user_id` from the JWT; any `user_id` passed in requests is ignored/validated against the token.
- Data isolation: DDB partition keys are user-scoped (e.g., `USER#{user_id}`) and S3 prefixes are partitioned per user.

### GET `/api/health`
- Returns `{ "ok": true }` with build/version metadata and a quick dependency probe (DDB/S3).

### 5.1 POST `/api/captures/trigger`
Request:
```json
{
  "url": "https://example.com/policy",
  "format": "pdf",
  "retention_class": "standard",
  "user_id": "user_123"
}
```

_Note_: `retention_class` is **optional** and defaults to `"standard"`; values may map to lifecycle tiers/classes configured in Terraform.

Response (201):
```json
{
  "id": "cap_01HDQ7...",
  "status": "QUEUED",
  "url": "https://example.com/policy",
  "format": "pdf",
  "requested_at": "2025-08-21T18:00:00Z"
}
```

### 5.2 GET `/api/captures/{id}`
Response (200):
```json
{
  "id": "cap_01HDQ7...",
  "schedule_id": null,
  "user_id": "user_123",
  "url": "https://example.com/policy",
  "format": "pdf",
  "s3_key": "captures/2025/08/21/cap_01HDQ7....pdf",
  "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "timestamp": "2025-08-21T18:02:11Z",
  "status": "SUCCEEDED"
}
```

### 5.3 GET `/api/captures/{id}/verify`
Response (200):
```json
{ "ok": true, "sha256_matches": true }
```

### 5.4 GET `/api/captures/{id}/download`
- 302 redirect to a short‑TTL **presigned URL** for the S3 object.

### 5.5 GET `/api/captures?user_id={user}&from={iso}&to={iso}`
- Paginated list with basic filters.

---

## 6) Data Models (DynamoDB)
### 6.1 Table: `csa-captures`
- **PK**: `SCHED#{schedule_id}` (or `SCHED#NONE` for on‑demand)
- **SK**: `TS#{iso8601_ts}#CAP#{capture_id}`
- **GSI1 (by user)**: PK = `USER#{user_id}`, SK = `TS#{iso}`
- **Attributes**: `capture_id`, `user_id`, `schedule_id?`, `url`, `format` (`pdf|png`), `s3_key`, `sha256`, `timestamp`, `status`, `duration_ms`, `error?`.

### 6.2 (Future) Table: `csa-schedules`
- **PK**: `USER#{user_id}`
- **SK**: `SCHED#{schedule_id}`
- **GSI1 (next run)**: PK = `NEXT_RUN#DATE`, SK = `TS#{iso}`
- **Attributes**: `schedule_id`, `url`, `cron`, `timezone`, `retention_class`, `next_run_at`, `enabled`.

**Notes**
- Always compute **SHA‑256** on artifact bytes; store in DDB and S3 object metadata (e.g., `x-amz-meta-sha256`).

---

## 7) Security, Compliance & IAM Guardrails
- **CloudTrail logs bucket**: also configured with **S3 Object Lock (Compliance mode)** and SSE‑KMS; enable **S3 data events** for the artifacts bucket.
- **Secrets handling**: Use **AWS Secrets Manager** or **SSM Parameter Store**; never log secrets; do **not** persist session cookies/headers in artifacts or logs.

- **S3**: Bucket with **Object Lock (Compliance mode)** + versioning; Lifecycle → Glacier; Block Public Access = on.
- **KMS**: SSE‑KMS with dedicated CMK; key policy restricted to service principals for CSA.
- **IAM**: Least privilege per function (scoped to bucket prefix + DDB table actions).
- **Audit**: Enable **CloudTrail S3 data events** for the bucket; structured app logs; alarm on error rate & DLQ depth.
- **PII caution**: Treat captured content as sensitive; downloads via presigned URL (short TTL), never public ACLs.
- **Rate limits**: Throttle on‑demand endpoint; retries with backoff; DLQ on capture Lambda.

---

## 8) Implementation Details
### 8.1 Capture Lambda (container image)
- **Playwright/Chromium** in Python; wait for `networkidle` and set PDF flags (A4, print background).
- Compute **SHA‑256** of PDF bytes.
- `put_object` to S3 with `ContentType="application/pdf"`, `Metadata={"sha256": "...", "url": "...", "timestamp": "..."};` use `ServerSideEncryption="aws:kms"` and `SSEKMSKeyId=...`.
- Write DDB item with metadata and `status="SUCCEEDED"` (or error path).
- Idempotency: de‑duplicate by `(url, day_bucket)` or supplied request id.

### 8.2 FastAPI app (Lambda)
- Routes per §5 using Pydantic models and structured error responses.
- Use a thin AWS client wrapper (`aws.py`) for S3/DDB interactions (facilitates mocking).

### 8.3 Frontend (React + shadcn/ui)
- `/captures` page: table with ID, url, timestamp, status, action buttons (Verify, Download).
- Hooks using React Query; optimistic filters only (no mutations).

### 8.4 Observability
- Metrics: `captures_triggered`, `captures_succeeded`, `captures_failed`, `pdf_bytes_size`.
- Logs: capture start/stop, URL, status, durations, S3 key (no secrets); structured JSON.
- Alarms: error rate > N in M minutes; DLQ depth > 0; Lambda duration p95 > threshold.

---

## 9) Validation & Test Plan (Gates must be executable)
**Local commands**
```bash
uv run ruff check . && uv run mypy src/
uv run pytest -q
```
**Unit/Integration**
- **moto** for S3 + DDB.
- **Playwright stub** (no real browser in tests) returning deterministic PDF bytes.
- Test hashing logic, S3 metadata, DDB write, and API responses.
**E2E Smoke (mocked backends)**
1) Call `POST /api/captures/trigger` for a URL.  
2) Capture stub creates PDF bytes → compute SHA‑256 → write mocked S3 + DDB.  
3) `GET /captures/{id}/verify` returns `{ ok: true, sha256_matches: true }`.  
4) `GET /captures/{id}/download` returns a (fake) presigned URL in tests.

---

## 10) Definition of Done
- All gates pass (ruff, mypy, pytest).
- API endpoints implemented with request/response validation.
- S3 writes include SSE‑KMS + metadata; DDB writes use correct keys.
- CloudTrail data events enabled for the bucket (document Terraform and how to verify).
- Minimal `/captures` UI page lists and verifies captures.
- **Rollback plan** documented (see below).

---

## 11) Risks & Mitigations
- **Cold starts / headless browser weight** → container image, adequate memory, keep functions cohesive.
- **Large pages / heavy fonts** → timeouts; increase Lambda timeout and page wait strategy.
- **Object Lock misconfig** → Terraform validation + post‑apply checks; do not ship without Object Lock enabled.
- **Clock skew** → rely on server timestamps for records; avoid client time for integrity flows.

---

## 12) Deliverables
- Backend code (FastAPI routers, AWS client wrapper, hashing utils, tests).
- Capture Lambda code (Dockerfile, handler, healthcheck, tests).
- Terraform (S3/KMS/DDB/IAM/API/Lambda; CloudTrail data events).
- Frontend `/captures` page (list + verify + download).
- Documentation updates (`docs/` + `CHANGELOG.md`).
- **Rollback plan**.

---

## 13) Rollback Plan
- Revert Terraform to previous known-good state (`terraform apply` of prior plan).
- Disable new API routes (stage variable flag) if needed.
- Roll back Lambda version/alias to prior release.
- Keep S3/DDB artifacts (immutable); mark failed release in `CHANGELOG.md` and open incident note.

---

## 14) Examples to Mirror (put these in `examples/`)
- `examples/backend/router_example.py` — idiomatic FastAPI router + Pydantic schema.
- `examples/backend/ddb_client.py` — thin Dynamo wrapper (get/put/query) with retries.
- `examples/capture/handler_stub.py` — Playwright stub for tests returning fixed PDF bytes.
- `examples/tests/test_capture_flow.py` — pytest pattern with moto + stub.

---

## 15) External References (add links as needed)
- FastAPI request/response models and dependency injection.
- Playwright Python PDF export (Chromium) and wait strategies.
- boto3 S3 `put_object` (metadata, SSE‑KMS) and presigned URLs.
- DynamoDB keys and GSIs (best practices for partition/sort design).
- S3 **Object Lock** (Compliance mode) configuration.
- CloudTrail **S3 data events** and verification.

---

## 16) Acceptance Criteria (Checklist)
- [ ] `POST /api/captures/trigger` returns 201 and enqueues/executes capture.
- [ ] Artifact stored in S3 with Object Lock, SSE‑KMS, and `sha256` metadata.
- [ ] DDB item written with correct keys/attributes.
- [ ] `GET /captures/{id}` and `/verify` return correct data; verify returns `ok: true`.
- [ ] `/captures` UI lists the new capture and “Verify” shows success.
- [ ] All validation gates pass locally and in CI (ruff, mypy, pytest).

---

## 17) Notes for `generate-prp`
- Treat this as the **feature file** when running `/generate-prp INITIAL.md`.
- The PRP must include: Purpose/Why (compliance + WORM), the architecture path in §4, data models in §6, and guardrails in §7.
- Include executable **validation gates** from §9 and the **E2E smoke** flow.
- Provide deliverables and rollback steps.
- Link to external docs you intend to follow.

