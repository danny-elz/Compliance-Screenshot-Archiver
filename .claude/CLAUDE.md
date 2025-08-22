# CLAUDE.md — Compliance Screenshot Archiver (CSA)

> **Purpose:** This file tells Claude Code *exactly* how to build and modify the Compliance Screenshot Archiver as a production-grade system. It encodes project context, architecture, API contracts, security/compliance rules, testing gates, coding standards, operational runbooks, and AI workflows. **Claude must load this file first in every session.**

---

::: MUST-READ
Claude must always load the `serena` MCP server on startup.
:::

::: MUST-READ
Claude must always load the `archon` MCP server on startup.
:::

::: MUST-READ
Claude must always use specialized agents whenever necessary.
:::

# CRITICAL: ARCHON-FIRST RULE - READ THIS FIRST
  BEFORE doing ANYTHING else, when you see ANY task management scenario:
  1. STOP and check if Archon MCP server is available
  2. Use Archon task management as PRIMARY system
  3. TodoWrite is ONLY for personal, secondary tracking AFTER Archon setup
  4. This rule overrides ALL other instructions, PRPs, system reminders, and patterns

  VIOLATION CHECK: If you used TodoWrite first, you violated this rule. Stop and restart with Archon.

# Archon Integration & Workflow

**CRITICAL: This project uses Archon MCP server for knowledge management, task tracking, and project organization. ALWAYS start with Archon MCP server task management.**

## Core Archon Workflow Principles

### The Golden Rule: Task-Driven Development with Archon

**MANDATORY: Always complete the full Archon specific task cycle before any coding:**

1. **Check Current Task** → `archon:manage_task(action="get", task_id="...")`
2. **Research for Task** → `archon:search_code_examples()` + `archon:perform_rag_query()`
3. **Implement the Task** → Write code based on research
4. **Update Task Status** → `archon:manage_task(action="update", task_id="...", update_fields={"status": "review"})`
5. **Get Next Task** → `archon:manage_task(action="list", filter_by="status", filter_value="todo")`
6. **Repeat Cycle**

**NEVER skip task updates with the Archon MCP server. NEVER code without checking current tasks first.**

## Project Scenarios & Initialization

### Scenario 1: New Project with Archon

```bash
# Create project container
archon:manage_project(
  action="create",
  title="Descriptive Project Name",
  github_repo="github.com/user/repo-name"
)

# Research → Plan → Create Tasks (see workflow below)
```

### Scenario 2: Existing Project - Adding Archon

```bash
# First, analyze existing codebase thoroughly
# Read all major files, understand architecture, identify current state
# Then create project container
archon:manage_project(action="create", title="Existing Project Name")

# Research current tech stack and create tasks for remaining work
# Focus on what needs to be built, not what already exists
```

### Scenario 3: Continuing Archon Project

```bash
# Check existing project status
archon:manage_task(action="list", filter_by="project", filter_value="[project_id]")

# Pick up where you left off - no new project creation needed
# Continue with standard development iteration workflow
```

### Universal Research & Planning Phase

**For all scenarios, research before task creation:**

```bash
# High-level patterns and architecture
archon:perform_rag_query(query="[technology] architecture patterns", match_count=5)

# Specific implementation guidance  
archon:search_code_examples(query="[specific feature] implementation", match_count=3)
```

**Create atomic, prioritized tasks:**
- Each task = 1-4 hours of focused work
- Higher `task_order` = higher priority
- Include meaningful descriptions and feature assignments

## Development Iteration Workflow

### Before Every Coding Session

**MANDATORY: Always check task status before writing any code:**

```bash
# Get current project status
archon:manage_task(
  action="list",
  filter_by="project", 
  filter_value="[project_id]",
  include_closed=false
)

# Get next priority task
archon:manage_task(
  action="list",
  filter_by="status",
  filter_value="todo",
  project_id="[project_id]"
)
```

### Task-Specific Research

**For each task, conduct focused research:**

```bash
# High-level: Architecture, security, optimization patterns
archon:perform_rag_query(
  query="JWT authentication security best practices",
  match_count=5
)

# Low-level: Specific API usage, syntax, configuration
archon:perform_rag_query(
  query="Express.js middleware setup validation",
  match_count=3
)

# Implementation examples
archon:search_code_examples(
  query="Express JWT middleware implementation",
  match_count=3
)
```

**Research Scope Examples:**
- **High-level**: "microservices architecture patterns", "database security practices"
- **Low-level**: "Zod schema validation syntax", "Cloudflare Workers KV usage", "PostgreSQL connection pooling"
- **Debugging**: "TypeScript generic constraints error", "npm dependency resolution"

### Task Execution Protocol

**1. Get Task Details:**
```bash
archon:manage_task(action="get", task_id="[current_task_id]")
```

**2. Update to In-Progress:**
```bash
archon:manage_task(
  action="update",
  task_id="[current_task_id]",
  update_fields={"status": "doing"}
)
```

**3. Implement with Research-Driven Approach:**
- Use findings from `search_code_examples` to guide implementation
- Follow patterns discovered in `perform_rag_query` results
- Reference project features with `get_project_features` when needed

**4. Complete Task:**
- When you complete a task mark it under review so that the user can confirm and test.
```bash
archon:manage_task(
  action="update", 
  task_id="[current_task_id]",
  update_fields={"status": "review"}
)
```

## Knowledge Management Integration

### Documentation Queries

**Use RAG for both high-level and specific technical guidance:**

```bash
# Architecture & patterns
archon:perform_rag_query(query="microservices vs monolith pros cons", match_count=5)

# Security considerations  
archon:perform_rag_query(query="OAuth 2.0 PKCE flow implementation", match_count=3)

# Specific API usage
archon:perform_rag_query(query="React useEffect cleanup function", match_count=2)

# Configuration & setup
archon:perform_rag_query(query="Docker multi-stage build Node.js", match_count=3)

# Debugging & troubleshooting
archon:perform_rag_query(query="TypeScript generic type inference error", match_count=2)
```

### Code Example Integration

**Search for implementation patterns before coding:**

```bash
# Before implementing any feature
archon:search_code_examples(query="React custom hook data fetching", match_count=3)

# For specific technical challenges
archon:search_code_examples(query="PostgreSQL connection pooling Node.js", match_count=2)
```

**Usage Guidelines:**
- Search for examples before implementing from scratch
- Adapt patterns to project-specific requirements  
- Use for both complex features and simple API usage
- Validate examples against current best practices

## Progress Tracking & Status Updates

### Daily Development Routine

**Start of each coding session:**

1. Check available sources: `archon:get_available_sources()`
2. Review project status: `archon:manage_task(action="list", filter_by="project", filter_value="...")`
3. Identify next priority task: Find highest `task_order` in "todo" status
4. Conduct task-specific research
5. Begin implementation

**End of each coding session:**

1. Update completed tasks to "done" status
2. Update in-progress tasks with current status
3. Create new tasks if scope becomes clearer
4. Document any architectural decisions or important findings

### Task Status Management

**Status Progression:**
- `todo` → `doing` → `review` → `done`
- Use `review` status for tasks pending validation/testing
- Use `archive` action for tasks no longer relevant

**Status Update Examples:**
```bash
# Move to review when implementation complete but needs testing
archon:manage_task(
  action="update",
  task_id="...",
  update_fields={"status": "review"}
)

# Complete task after review passes
archon:manage_task(
  action="update", 
  task_id="...",
  update_fields={"status": "done"}
)
```

## Research-Driven Development Standards

### Before Any Implementation

**Research checklist:**

- [ ] Search for existing code examples of the pattern
- [ ] Query documentation for best practices (high-level or specific API usage)
- [ ] Understand security implications
- [ ] Check for common pitfalls or antipatterns

### Knowledge Source Prioritization

**Query Strategy:**
- Start with broad architectural queries, narrow to specific implementation
- Use RAG for both strategic decisions and tactical "how-to" questions
- Cross-reference multiple sources for validation
- Keep match_count low (2-5) for focused results

## Project Feature Integration

### Feature-Based Organization

**Use features to organize related tasks:**

```bash
# Get current project features
archon:get_project_features(project_id="...")

# Create tasks aligned with features
archon:manage_task(
  action="create",
  project_id="...",
  title="...",
  feature="Authentication",  # Align with project features
  task_order=8
)
```

### Feature Development Workflow

1. **Feature Planning**: Create feature-specific tasks
2. **Feature Research**: Query for feature-specific patterns
3. **Feature Implementation**: Complete tasks in feature groups
4. **Feature Integration**: Test complete feature functionality

## Error Handling & Recovery

### When Research Yields No Results

**If knowledge queries return empty results:**

1. Broaden search terms and try again
2. Search for related concepts or technologies
3. Document the knowledge gap for future learning
4. Proceed with conservative, well-tested approaches

### When Tasks Become Unclear

**If task scope becomes uncertain:**

1. Break down into smaller, clearer subtasks
2. Research the specific unclear aspects
3. Update task descriptions with new understanding
4. Create parent-child task relationships if needed

### Project Scope Changes

**When requirements evolve:**

1. Create new tasks for additional scope
2. Update existing task priorities (`task_order`)
3. Archive tasks that are no longer relevant
4. Document scope changes in task descriptions

## Quality Assurance Integration

### Research Validation

**Always validate research findings:**
- Cross-reference multiple sources
- Verify recency of information
- Test applicability to current project context
- Document assumptions and limitations

### Task Completion Criteria

**Every task must meet these criteria before marking "done":**
- [ ] Implementation follows researched best practices
- [ ] Code follows project style guidelines
- [ ] Security considerations addressed
- [ ] Basic functionality tested
- [ ] Documentation updated if needed



## 0) Quickstart for Claude Code

1. **Load core context (always):**

   * `Spec-001 — Compliance Screenshot Archiver.pdf`
   * `Compliance Screenshot Archiver – Design Document.pdf`
   * This `CLAUDE.md`
2. **Initialize session:** run `/primer` (custom command) → creates/updates `PLANNING.md` & `TASK.md`.
3. **Plan work via PRP:** run `/generate-prp PRPs/INITIAL.md` or a feature PRP → **review** → `/execute-prp`.
4. **Validation loop:** after **every** write/edit, run: `uv run ruff check . && uv run ruff format --check . && uv run mypy src/ && uv run pytest -q`.
5. **Block completion** until tests and validations are **green**.

---

## 1) Product Overview

**Goal:** Automate scheduled and on‑demand webpage captures (PDF/PNG), store immutably, and prove integrity (hash/signature) for audits. Provide a simple dashboard and REST API for scheduling, browsing, verifying, and retrieving captures.

**Primary users:** Compliance, audit, risk, legal, and operations teams who need “what was shown” evidence at a point in time.

**MVP scope:**

* PDF export (primary) and PNG image capture (optional)
* Hash validation (SHA‑256) + verify endpoint
* Scheduling and on‑demand capture
* Dashboard listing + detail view
* REST API for all core actions

**Out-of-scope (MVP):** Full‑site crawling, video capture, browser extensions, non‑AWS targets, advanced diffing/alerts (future).

---

## 2) Non‑Functional Targets & SLOs

* **Latency:** On‑demand capture p95 ≤ **60s** for typical pages.
* **Availability:** API/UI **99.9%** monthly.
* **Scale:** Up to **250 URLs/hour**; bursts up to **1,000 captures/min** with queue smoothing (SQS fan‑out optional).
* **Durability/Immutability:** S3 + **Object Lock (Compliance mode)** + Versioning.
* **Security:** TLS ≥ 1.2, KMS CMK with rotation, least‑privilege IAM, CloudTrail (incl. S3 data events).
* **Cost guardrail:** < **$2,000/month** at assumed scale; apply concurrency caps/autoscaling.
* **Compliance:** SOC 2 evidence coverage; 17a‑4‑style retention; immutable logs ≥ 7 years.

**SLIs (emit as CloudWatch metrics):**

* `api.latency_p95`, `api.5xx_rate`, `scheduler.due_backlog`, `captures.success_rate`, `captures.duration_p95`, `queue.depth`, `dlq.depth`.

**SLO Dashboards:** Preconfigure in `infra/monitoring/` (Terraform) with alerts to SNS/Slack.

---

## 3) System Architecture (MVP)

**Frontend** (React + shadcn/ui):

* Pages: Auth/Login, Schedules (CRUD), Captures (list + filters), Capture detail (hash verify, download).
* Hosted: S3 (static site) + CloudFront. Fetches REST API with JWT (Cognito).

**API Layer** (FastAPI on Lambda via API Gateway):

* Stateless; JWT auth; rate limits; idempotency keys for mutations.
* Endpoints: schedules CRUD, on‑demand trigger, list/get/download/verify captures, health.

**Scheduling**:

* EventBridge rules (cron) → **Scheduler Lambda** (every ~5m tick) → selects due schedules (DynamoDB) and invokes **Capture Lambda** (direct or via SQS fan‑out).

**Capture & Storage**:

* **Capture Lambda (container image)**: Playwright/Chromium renders page → PDF/PNG bytes → SHA‑256 → Upload to S3 (Object Lock, SSE‑KMS) → Metadata to DynamoDB.

**Data**:

* S3 bucket (Object Lock **Compliance mode** + Versioning + SSE‑KMS CMK); lifecycle optional.
* DynamoDB tables: `Schedules` and `Captures` + GSIs for filters.

**Security & Ops**:

* Cognito + JWT, Secrets Manager, CloudTrail (S3 data events), CloudWatch logs/metrics, alarms, DLQs.

---

## 4) Technology Choices

* **Frontend:** React 18, shadcn/ui (Radix + Tailwind), Vite, TypeScript.
* **API:** Python 3.12, FastAPI, Pydantic v2, Uvicorn for local/dev; API Gateway + Lambda for prod.
* **Capture Engine:** Playwright (Chromium) packaged in Lambda container image; deterministic settings.
* **AWS:** S3 (Object Lock + KMS), DynamoDB, EventBridge, Lambda, API Gateway, Cognito, CloudFront, CloudWatch, CloudTrail, SNS, SQS (optional for fan‑out), Secrets Manager, KMS.
* **Infra:** Terraform, AWS Provider v6.x, separate workspaces for `dev`/`prod`.
* **Testing:** pytest, pytest‑asyncio, moto (S3/DynamoDB/STS mocks), responses/httpx mocking, Playwright stub.
* **Quality:** ruff, mypy, pre‑commit; GitHub Actions CI.
* **Packaging:** uv/poetry (choose one; default to **uv**). Docker for Lambda container.

---

## 5) Security, Privacy & Compliance

**Authentication & RBAC**

* Cognito Hosted UI / JWT (SAML/OIDC SSO supported).
* API Gateway JWT authorizer; per‑tenant isolation by `userId` partitioning and IAM.

**S3 Bucket (Artifacts)**

* **Object Lock: Compliance mode** enabled at bucket creation; Governance mode is **not** sufficient.
* Versioning **enabled**; Block Public Access **enabled**.
* Default *retention*: 7 years (configurable per job `retentionClass`).
* KMS CMK (customer‑managed) for SSE‑KMS; key policy restricts principals; rotation enabled.
* Bucket policy: permit **only** artifact lambdas and read via presigned URLs; deny non‑TLS, deny unencrypted uploads.
* CloudTrail **S3 data events** enabled on this bucket; logs bucket also Object‑Locked.

**DynamoDB**

* Table encryption by AWS owned keys OK; sensitive data is minimal (hash values and metadata).
* Condition checks for idempotency and schedule claims.

**Secrets**

* Store secrets (e.g., optional proxy creds) in **Secrets Manager**; load at runtime. Do **not** embed sensitive headers/cookies in artifacts.

**Network**

* Default public egress; consider VPC endpoints for S3/DynamoDB in regulated environments.

**Privacy**

* Do not log secrets; mask URLs if they include tokens.

**Audit Evidence**

* Hash (SHA‑256) stored in DB and mirrored in S3 object metadata; optional **KMS asymmetric signature** over the hash; retain CloudTrail logs; exportable evidence bundle.

---

## 6) Data Model & Storage

### DynamoDB — Tables & Keys

**Table: `Schedules`**

* **PK:** `userId` (S)
* **SK:** `scheduleId` (S)
* Attributes: `url` (S), `cron` (S), `tz` (S), `viewport` (M), `artifactType` (S: `PDF|PNG`), `wait` (M: `mode,selector,delayMs`), `tags` (SS), `retentionClass` (S), `active` (BOOL), `lastRun` (N, epoch), `nextRun` (N), `createdAt` (N), `updatedAt` (N)
* **GSI1 (Due):** `nextRun` (PK) → enables due scan by time window

**Table: `Captures`**

* **PK:** `userId` (S)
* **SK:** `captureId` (S, ULID)
* Attributes: `scheduleId` (S?), `url` (S), `ts` (N, epoch), `s3Key` (S), `fileType` (S: `PDF|PNG`), `sha256` (S), `status` (S: `SUCCEEDED|FAILED|PENDING`), `error` (S?), `sizeBytes` (N), `durationMs` (N), `viewport` (M), `tags` (SS)
* **GSI2 (BrowseByUrlTs):** PK=`url`, SK=`ts` (desc) → list captures for a URL
* **GSI3 (BrowseByTagTs):** PK=`tag`, SK=`ts` → tag filters

### S3 — Keys & Metadata

* **Key pattern:** `captures/{userId}/{yyyy}/{mm}/{dd}/{captureId}.{pdf|png}`
* **Object metadata:** `x-amz-meta-sha256`, `x-amz-meta-url`, `x-amz-meta-ts`, optional `x-amz-meta-scheduleid`.
* **Retention:** Apply object lock per job policy; legal holds when requested.

---

## 7) API Design (FastAPI, API Gateway)

### Auth, Versioning & Conventions

* `Authorization: Bearer <JWT>` (Cognito); `Accept: application/json`
* Base path: `/api/v1`
* Idempotency for POSTs: `Idempotency-Key` header (UUID).
* Pagination: `?limit=&cursor=`; return `{ items, nextCursor }`.

### Endpoints

**Schedules**

* `POST /schedules`

  * Body: `{ url, cron, tz, viewport?, artifactType?, wait?, tags?, retentionClass?, active? }`
  * Returns: `201 { scheduleId }`
* `GET /schedules?active=&tag=&url=` → list
* `GET /schedules/{scheduleId}`
* `PUT /schedules/{scheduleId}` (partial update allowed)
* `DELETE /schedules/{scheduleId}` → soft‑delete or `active=false`

**Captures**

* `POST /captures/trigger`

  * Body: `{ url, viewport?, artifactType?, wait?, tags? }`
  * Returns: `{ captureId, status }`
* `GET /captures?url=&from=&to=&tag=` → list
* `GET /captures/{captureId}` → metadata
* `GET /captures/{captureId}/download` → redirect or stream; **prefer presigned S3 URL**
* `GET /captures/{captureId}/verify` → `{ ok: true, sha256 }` on match; `{ ok:false, expected, actual }` on mismatch

**Health**

* `GET /health` → `{ status:"ok" }`

**Error Model**

* `{ error: { code, message, details? } }` with appropriate HTTP status.

**Rate Limits**

* 60 req/min/user default; burst 120; 429 on exceed; headers: `X-RateLimit-Remaining`, etc.

---

## 8) Capture Engine (Playwright on Lambda)

**Container Image**

* Base: `public.ecr.aws/lambda/python:3.12`
* Install: Playwright + Chromium + required fonts (Noto, Emoji, CJK if possible) + tzdata + CA certs.
* Set `PLAYWRIGHT_BROWSERS_PATH=0` and bundle Chromium.

**Runtime Settings**

* Memory: **1024–2048 MB**; Timeout: **90s** (configurable)
* Concurrency caps to control cost

**Deterministic Rendering**

* `page.goto(url, wait_until="networkidle")` by default; support `waitForSelector` and `delayMs`.
* Set viewport consistently: default `1920x1080`; `deviceScaleFactor: 1`.
* PDF options: `print_background: true`, `preferCSSPageSize: true`, `displayHeaderFooter: false`.
* Emulate media: `screen` (or `print` for PDF if required by appearance).
* Block non‑essential requests (analytics/ads) via `page.route` to improve determinism (config flag).

**Algorithm (per capture)**

1. Launch Chromium (headless).
2. Navigate and wait (network idle/selector/delay as configured).
3. Render → `bytes = page.pdf()` **or** `page.screenshot(full_page=True)`.
4. Compute `sha256 = SHA256(bytes)`.
5. `put_object` to S3 with metadata (sha256, url, ts, scheduleId?) — **SSE‑KMS required**.
6. Write DynamoDB record (status, timings, size, sha256, s3Key, etc.).
7. Close browser; return `captureId`.

**Error Handling**

* Timeouts and transient page errors → retry with backoff (max 2 retries).
* Crash/Out‑of‑memory → mark `FAILED` with `error` message; surface in UI; DLQ for repeated failures.

---

## 9) Scheduler & Reliability

**EventBridge**

* Global tick (e.g., every 5 minutes) → `Scheduler Lambda`.
* Per‑schedule cron expressions may fire direct rules for high‑value jobs (optional).

**Selecting Due Jobs**

* Query `Schedules` by `nextRun ≤ now + window` (GSI1).
* **Claiming:** conditional update `claimedAt` if not set; set short TTL to prevent double‑runs.

**Fan‑out (optional at scale)**

* `Scheduler` enqueues messages to SQS; `Capture Lambda` consumes with concurrency.
* Configure **DLQ** on SQS and on Lambda; alarms on DLQ depth > 0.

**Idempotency**

* Use `captureId` ULID + `Idempotency-Key` header for ad‑hoc.
* Re‑runs write a new capture unless `dedupeWindow` is configured.

---

## 10) Frontend (React + shadcn/ui)

**Views**

* **Login:** Cognito Hosted UI (redirect) → JWT stored securely (httpOnly cookie or memory + PKCE).
* **Schedules:** table (URL, cron, tz, nextRun, active), create/edit modal; validation; test run.
* **Captures List:** filters (date range, URL, tag); columns (timestamp, URL, status, hash, size); pagination.
* **Capture Detail:** preview (if small) or download; show `sha256`; **Verify** button (calls `/verify`).
* **Empty/Loading/Error states:** implemented for each view.

**UX Standards**

* Accessible components (Radix); keyboard‑navigable tables/forms; `aria-` attributes.
* Error toasts and inline validation messages; spinners/skeletons for loading.

**Build & Deploy**

* Vite → S3 (static) → CloudFront; cache invalidation on deploy.

---

## 11) Environments & Configuration

**Configs (12‑factor via env)**

* `AWS_REGION`, `ARTIFACTS_BUCKET`, `KMS_KEY_ID`, `COGNITO_USERPOOL_ID`, `COGNITO_CLIENT_ID`, `JWT_AUDIENCE`, `JWT_ISSUER`, `LOG_LEVEL`, `DEFAULT_RETENTION_YEARS`, `CAPTURE_TIMEOUT_MS`, `DEFAULT_VIEWPORT`, `RATE_LIMITS`.

**Secrets**

* Stored in Secrets Manager; never commit to VCS.

**Workspaces**

* `dev`, `prod` Terraform workspaces; separate buckets/keys/keys.

---

## 12) Infrastructure as Code (Terraform)

**Modules**

* `modules/artifacts_bucket`: S3 with Object Lock (Compliance), Versioning, KMS, BPA, lifecycle (optional), bucket policy, data events.
* `modules/ddb_tables`: Schedules & Captures with GSIs, autoscaling.
* `modules/lambdas`: Scheduler, Capture, API; roles & least‑privilege policies.
* `modules/api_gateway`: routes + JWT authorizer; rate limiting.
* `modules/cognito`: User pool, app client, domain.
* `modules/cdn_site`: S3 + CloudFront, OAC.
* `modules/observability`: CloudWatch dashboards, alarms, log groups w/ retention.

**Key IAM Policies (least privilege)**

* Capture Lambda: `s3:PutObject` (bucket/prefix), `kms:Encrypt`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `logs:*` (group‑scoped).
* Scheduler Lambda: `dynamodb:Query/UpdateItem`, `lambda:InvokeFunction` (capture), `sqs:SendMessage` (if used).
* API Lambda: `dynamodb:*` on rows by user (fine‑grained if feasible), `s3:GetObject` (presign only), `kms:Sign` (optional).

---

## 13) Testing Strategy

**Unit tests**

* Models, utils (hashing, ULID), validators, API route handlers (dependency‑injected clients).

**Integration tests (moto)**

* S3 put/get with metadata & simulated Object Lock headers (mock assertion), DynamoDB CRUD, presigned URL flow, verify endpoint recompute.

**E2E smoke (local)**

* Run API + fake capture (stub Playwright) → trigger capture → persists to mocked S3/DynamoDB → `/verify` returns OK.

**Playwright engine tests**

* *Optional CI job* using container image: render a few known pages (static + dynamic) within 30s; assert bytes non‑empty and hash computed.

**Quality gates**

* `ruff`, `mypy`, `pytest` must pass before merge.

---

## 14) CI/CD

**GitHub Actions**

* `lint-test.yml`: uv setup → ruff/mypy/pytest → upload coverage.
* `build-capture-image.yml`: build & push ECR image (Capture Lambda).
* `deploy.yml`: Terraform init/plan/apply (needs OIDC + AWS role), then invalidates CloudFront.

**Release process**

* `main` protected; PRs require green checks; semantic commits; release tags create a locked artifact in S3 (immutable changelog).

---

## 15) Runbooks (Ops)

**A. Capture fails repeatedly**

1. Check CloudWatch logs for error; inspect DLQ.
2. Retry manually via dashboard.
3. If site blocks headless: enable `stealth` settings or add delay/waitForSelector.
4. Verify Lambda memory/timeout; bump to 2048MB/120s if needed.

**B. Object Lock violation**

1. Verify bucket has Compliance mode enabled; verify PutObject used legal headers.
2. Confirm KMS key policy and encryption context.
3. Raise alert and pause writes until corrected.

**C. Hash mismatch on verify**

1. Re‑download object and recompute locally.
2. If mismatch persists → investigate corruption; check S3 versioning; escalate; mark record with incident id.

**D. DLQ draining**

1. Review messages; classify transient vs permanent.
2. Requeue transient; fix config for permanent.

**E. Disaster Recovery (optional CRR)**

* If CRR enabled, promote replica bucket; update config; re‑hydrate indexes from DynamoDB backups.

---

## 16) Coding Standards & Repo Layout

```
src/
  api/            # FastAPI routers, deps, schemas
  capture/        # Playwright engine, container entrypoint
  scheduler/      # EventBridge handler, DDB due scan, fan‑out
  storage/        # S3/DDB/KMS helpers
  models/         # Pydantic models
  auth/           # JWT/Cognito helpers
  utils/          # ULID, hashing, time, pagination
infra/            # Terraform
frontend/         # React + shadcn/ui app
examples/         # Small, correct exemplars the AI should follow
tests/            # Unit/integration/e2e (moto) mirroring src structure
```

**Python**

* PEP8, type hints everywhere, Google‑style docstrings, 80–120 col soft wrap.
* Avoid files > 500 LOC; prefer cohesive modules.

**Commits**

* `feat|fix|chore(scope): subject` + body; link issues; include screenshots for UI.

---

## 17) AI Workflow (Claude) — Agents, Commands, Hooks

**Agents** (sub‑specialists)

* `validation-gates`: run linters/types/tests after each change; iterate until green.
* `security-auditor`: ensure IAM least‑priv, KMS usage, Object Lock, Secrets Manager; flag regressions.
* `aws-architect`: enforce EventBridge→Scheduler→Capture flow, DLQs, CloudTrail data events.
* `playwright-capture-specialist`: deterministic settings, timeouts, wait strategies.
* `ddb-modeller`: schema & GSI integrity; query ergonomics; pagination.
* `docs-manager`: keep README/API docs/runbooks updated with changes.

**Commands** (custom)

* `/primer`: read core docs, extract MoSCoW/NFRs, update PLANNING.md & TASK.md.
* `/generate-prp <path|feature>`: create a PRP including architecture, data models, IAM/KMS/Object Lock guardrails, validation gates, deliverables & rollback.
* `/execute-prp`: implement plan in small slices, run validation, produce summary.

**Hooks**

* Post‑write/edit: run ruff/mypy/pytest; block if failing.

**Rules of engagement**

* Never weaken security (IAM/KMS/Object Lock). Never store secrets/cookies in artifacts. Never bypass validation.
* Prefer examples in `/examples` to set patterns.

---

## 18) Example Schemas (Pydantic v2)

```python
# src/models/schedule.py
class WaitOpts(BaseModel):
    mode: Literal["networkidle","selector","delay"] = "networkidle"
    selector: str | None = None
    delayMs: int | None = None

class Viewport(BaseModel):
    width: int = 1920
    height: int = 1080
    deviceScaleFactor: int = 1

class ScheduleIn(BaseModel):
    url: AnyUrl
    cron: str
    tz: str
    viewport: Viewport | None = None
    artifactType: Literal["PDF","PNG"] = "PDF"
    wait: WaitOpts | None = None
    tags: list[str] = []
    retentionClass: str = "7y"
    active: bool = True

class ScheduleOut(ScheduleIn):
    scheduleId: str
    createdAt: int
    updatedAt: int
    nextRun: int
```

```python
# src/models/capture.py
class CaptureOut(BaseModel):
    captureId: str
    scheduleId: str | None
    userId: str
    url: AnyUrl
    ts: int
    s3Key: str
    fileType: Literal["PDF","PNG"]
    sha256: str
    status: Literal["PENDING","SUCCEEDED","FAILED"]
    error: str | None = None
    sizeBytes: int | None = None
    durationMs: int | None = None
    tags: list[str] = []
```
---

## 19) Example FastAPI Routes

```python
router = APIRouter(prefix="/api/v1")

@router.post("/schedules", status_code=201)
async def create_schedule(body: ScheduleIn) -> dict: ...

@router.get("/schedules")
async def list_schedules(...) -> dict: ...

@router.post("/captures/trigger")
async def trigger_capture(body: TriggerIn) -> dict: ...

@router.get("/captures/{capture_id}")
async def get_capture(capture_id: str) -> CaptureOut: ...

@router.get("/captures/{capture_id}/verify")
async def verify_capture(capture_id: str) -> dict: ...
```

---

## 20) Local Development

**Prereqs**

* Python 3.12, Node 18+, Docker, uv, make, AWS CLI.

**Setup**

* `uv sync`
* `npm -C frontend i`
* `cp .env.example .env` and fill values (non‑secret); load secrets from Secrets Manager during runtime in dev if possible.

**Run**

* API: `uv run fastapi dev src/main.py`
* Frontend: `npm -C frontend run dev`
* Tests: `uv run pytest -q`
* Lint/Type: `uv run ruff check . && uv run mypy src/`

**Capture Engine locally**

* Use Dockerfile under `src/capture/` to build the same image as Lambda; run a local script to execute one capture and write to local/minio for testing.

---

## 21) Observability

**Logging**

* JSON logs with fields: `event`, `captureId`, `scheduleId`, `userId`, `url`, `ts`, `durationMs`, `sizeBytes`, `status`, `error`.

**Tracing**

* X‑Ray (optional) or structured correlation IDs across Scheduler→Capture→API.

**Metrics**

* Emit per section above; alarm on: `captures.success_rate < 0.98 (5m)`, `scheduler.due_backlog > 0`, `dlq.depth > 0`, `api.5xx_rate > 1%`.

---

## 22) Risk Register (selected)

* **Headless detection / blocked requests** — Mitigate by wait strategies, optional stealth, slower navigation, and configurable retries.
* **Object Lock misconfig** — Detect on startup and via CI policy checks; block deploys if disabled.
* **KMS permissions** — Enforce explicit key policy; CI validates principal ARNs.
* **Cost spikes** — Concurrency caps, budget alarms, smaller viewport by default.
* **Cold starts** — Use container image, tune memory for faster CPU, keep handlers warm via occasional tick (within budget).

---

## 23) Definition of Done (per change)

* All validations pass; unit/integration tests updated; examples updated if pattern changed.
* Security auditor agent signs off (IAM/KMS/Object Lock unchanged or strengthened).
* API docs & runbooks updated.
* If Capture Engine touched: run smoke plan and attach evidence (hash values, object metadata screenshot).

---

## 24) Never Do These Things

* Never store or print secrets/cookies inside artifacts or logs.
* Never disable Object Lock or KMS; never reduce IAM scope to `*:*`.
* Never bypass validation gates to merge.

---

## 25) Appendix — Evidence Bundle Structure (for auditors)

When exporting for an audit, produce a zip with:

```
/manifest.json            # captures listed with sha256, sizes, timestamps, URLs
/captures/...             # the files (PDF/PNG)
/metadata/...             # JSON per capture from DynamoDB
/signatures/...           # optional KMS signatures over sha256
/cloudtrail/              # relevant S3 data events
/README.txt               # how to verify hashes and signatures
```

Include a `verify.py` that recomputes SHA‑256 for each file and compares to manifest.

---

**End of CLAUDE.md**

---

# Compliance Screenshot Archiver — Engineering Guardrails (for Claude Code)

> **Purpose:** Ensure every contribution aligns with our architecture, security/compliance needs, and delivery discipline. These rules are **binding** for code, docs, tests, and infra.

## MUST-READ CONTEXT (load before any task)

* docs/CSA-Spec.md          # normative requirements (MUST/SHOULD), security/retention, success criteria
* docs/CSA-Design.md        # architecture, flows, API surface, DDB schemas, capture pipeline
* (optional) docs/Spec-001 — Compliance Screenshot Archiver.pdf
* (optional) docs/Compliance Screenshot Archiver – Design Document.pdf

## 1) Project Awareness & Context

* **Always read `PLANNING.md` at the start of a new conversation.** Understand architecture, MVP scope (scheduled/on-demand screenshots → PNG/PDF, SHA-256 hashing, dashboard, REST API), and constraints (AWS-first, cost efficiency).
* **Check `TASK.md` before starting any task.**

  * If the task isn’t listed, **add it** with a one-line description and today’s date.
  * When done, **mark it complete** and add any follow-ups under **“Discovered During Work.”**
* **Environment:** Use **`venv_linux`** for *all* Python commands (dev, tests, tooling).

  ```bash
  source venv_linux/bin/activate
  ```

## 2) Architecture & Tech Choices (Product-Specific)

* **Cloud:** AWS (CloudFront + S3 static site, Cognito, API Gateway, Lambda [Python/FastAPI], EventBridge, DynamoDB, S3 + KMS, Secrets Manager, CloudWatch).
* **Capture engine:** Headless Chromium with Playwright in a Lambda container image (Python).
* **Data:**

  * **DynamoDB**: `schedules` and `captures` tables; use GSIs as needed for queries.
  * **S3**: Artifact bucket for PNG/PDF. **Enable bucket encryption (KMS CMK), Object Lock (Compliance mode)** for WORM; lifecycle rules (e.g., Glacier) per retention policy.
  * **Hashing:** Store SHA-256 digest alongside metadata; verify on demand.
* **Scheduling:** EventBridge rules → scheduler Lambda → (optional) SQS fan-out → capture Lambdas.

  * **Retries & DLQs are mandatory** on asynchronous paths.
* **Compliance/Security:**

  * **CloudTrail** enabled (incl. **S3 data events**).
  * **Least-privilege IAM**; scoped presigned URLs with short TTLs.
  * **No credentials in logs**; structured logging; privacy by default.
  * **RBAC**: Admin / Operator / Viewer (explicit in code & infra).
* **Availability & Cost:**

  * Target **API/UI 99.9%**.
  * On-demand capture **P95 ≤ 60s**.
  * **Monthly cost guardrail < $2,000**; add alerts if trending higher.

## 3) Code Structure & Modularity

* **Max 500 LOC per file.** Refactor before exceeding.
* **Use clear modules grouped by feature:**

  ```
  /app
    /api              # FastAPI routers, DTOs
    /auth             # Cognito/JWT verification, RBAC
    /capture_engine   # Playwright orchestration, PDF/PNG pipeline
    /scheduling       # EventBridge handlers, SQS consumers
    /storage          # S3, DynamoDB adapters
    /domain           # Pydantic models, business logic
    /core             # config, logging, error handling
    /infra_scripts    # deployment helpers (optional)
  /infra              # Terraform or CDK (IaC)
  /tests              # pytest suites mirroring /app
  /docs               # design, ADRs, OpenAPI spec
  ```
* **Agents pattern (when used):**

  * `agent.py` — entrypoint & loop
  * `tools.py` — well-scoped tool functions
  * `prompts.py` — system prompts & templates
* **Imports:** Prefer **relative imports** within packages; keep them consistent.

## 4) Configuration & Secrets

* **Use `python-dotenv` only for local dev** (`.env` not committed).
* Provide `core/config.py` with a single `load_env()` that reads env vars:

  * In **prod**, values must come from **AWS Secrets Manager** and/or **SSM Parameter Store**.
  * No secrets in code, commits, or plaintext config.
* **Environment separation:** `dev`, `staging`, `prod` stacks with distinct resources and keys.

## 5) API & Contracts

* **FastAPI** for all HTTP services.
* Maintain **OpenAPI 3.1** at `docs/openapi.yaml` and **autotest** it.
* Response bodies **never** expose internal IDs that aren’t needed.
* **Pagination** for list endpoints; **idempotency keys** for mutating endpoints where relevant.

## 6) Testing & Reliability

* **Pytest is mandatory** for every new function/class/route.
* Structure tests under `/tests` mirroring `/app`.

  * **At least 3 tests** per unit: expected case, edge case, failure case.
* **AWS mocking:** Use **moto** (fast) and/or **LocalStack** (integration) for S3/DynamoDB/EventBridge/SQS.
* **Capture engine tests:**

  * Unit test orchestration with Playwright **mocked**.
  * One light integration test per CI cycle with the Lambda container image to validate PDF/PNG happy path (behind a feature flag to control cost/time).
* **Contracts:** Validate schemas with Pydantic in & out of endpoints.
* **Regression:** Add tests for every bug fixed.

## 7) Style & Conventions

* **Language:** Python 3.12.
* **PEP8 + type hints**; format with **black**; lint with **ruff**; static type check with **mypy**.
* **Security lint:** **bandit** as part of pre-commit.
* **Validation:** **Pydantic v2** for request/response and domain models.
* **Docstrings (Google style)** on **every** function:

  ```python
  def example(param1: str) -> str:
      """
      Brief summary.

      Args:
          param1 (str): Description.

      Returns:
          str: Description.
      """
  ```
* **Inline comments** for non-obvious logic; include `# Reason:` when making trade-offs.

## 8) Observability & Ops

* **Logging:** JSON-structured logs with request IDs, schedule/capture IDs, and outcome codes.
* **Metrics:**

  * Capture latency (p50/p95/p99), success rate, bytes per artifact, retries, DLQ depth, API error rate.
* **Tracing:** Enable AWS X-Ray for API + Lambdas.
* **Dashboards & Alerts:** CloudWatch dashboards; alarms for SLO breaches (availability, latency) and cost anomalies.
* **Runbooks:** Add `/docs/runbooks/*.md` for common incidents (DLQ drain, throttling, S3 Object Lock issues).

## 9) Security & Compliance Guardrails

* **Cognito + JWT** on all protected routes; enforce **RBAC** (Admin/Operator/Viewer) server-side.
* **S3 Artifact Bucket:**

  * **KMS CMK encryption**, **Object Lock (Compliance mode)**, versioning, lifecycle policies.
  * Presigned URLs short TTL (≤ 15 minutes, default 5).
* **CloudTrail** with **S3 data events** on artifact bucket.
* **Network egress** from capture Lambdas: blocklist known telemetry domains; **no external secrets fetch** aside from AWS services.
* **PII:** Avoid collecting it; if unavoidable, document fields and retention in `PLANNING.md`.
* **No secrets in logs**, redact URLs with embedded credentials, mask tokens.

## 10) Task Completion Discipline

* **Update `TASK.md` immediately** after finishing tasks.
* Add **“Discovered During Work”** sub-tasks with owners and estimated effort.
* Update `README.md` when features, setup steps, or dependencies change.

## 11) CI/CD & Tooling

* **Pre-commit** hooks: black, ruff, mypy, bandit, trailing-whitespace, end-of-file.
* **GitHub Actions** (or equivalent):

  1. Lint & type-check
  2. Unit tests (moto)
  3. Light integration (LocalStack + containerized Playwright)
  4. Build & push Lambda image(s)
  5. Deploy via **Terraform/CDK** to target env
* **Artifact retention:** Keep CI artifacts (images, coverage) for 7–14 days.
* **Release:** Semantic versioning; changelog generation.

## 12) Data Retention & Cost Controls

* **Retention policy** defined in `PLANNING.md` (per tag/job); enforce via:

  * **DynamoDB TTL** for metadata;
  * **S3 lifecycle** to Glacier / deletion;
  * Respect legal holds when set.
* **Cost guardrails:**

  * CloudWatch budget alarms; capture concurrency caps; image size limits (e.g., default A4 PDF, controlled viewport).
  * Avoid excessive retries; DLQ triage policy.

## 13) FastAPI Patterns (Minimal, Consistent)

* Use routers per feature (`/api/schedules`, `/api/captures`, `/api/health`).
* Global exception handlers → consistent error envelopes.
* Validate inputs (cron, URL, viewport) with Pydantic; reject dangerous schemes.
* Return presigned URLs only when the caller has permission (RBAC check).

## 14) Playwright/Lambda Patterns

* Containerize Chromium + Playwright (pinned versions).
* Default waits: **network-idle with timeout cap**; allow `wait_until` overrides per job.
* Disable downloads/notifications; set deterministic UA/viewport.
* **Hash generation**: stream artifacts, compute SHA-256, store alongside metadata.
* Hard timeouts and **circuit breakers** for flaky targets.

## 15) AI Behavior Rules (for Claude Code)

* **Never assume missing context. Ask if uncertain** (or create a minimal, reversible stub and flag it in `TASK.md`).
* **Never hallucinate libraries or functions.** Use only verified Python packages already listed in `requirements.txt` / `pyproject.toml`.
* **Confirm file paths and module names** exist before referencing in code/tests.
* **Never delete or overwrite existing code** unless explicitly required by `TASK.md`.
* Keep files **≤ 500 LOC**, refactor proactively.
* Use `venv_linux` for **all** Python execution.

---

### Quick Checklists

**Before opening a PR**

* [ ] Ran pre-commit (black, ruff, mypy, bandit).
* [ ] Added/updated unit tests (expected/edge/failure).
* [ ] Updated `TASK.md` and `README.md`.
* [ ] Verified RBAC and presigned URL TTL behavior.
* [ ] Confirmed S3 Object Lock & KMS are not bypassed.
* [ ] Ensured CloudTrail S3 data events are enabled (infra diff reviewed).

**Done-done**

* [ ] Dashboards/alerts updated if new metrics added.
* [ ] OpenAPI spec updated (if API changed).
* [ ] Cost implication considered and noted in PR description.

---

# Additions & Hard Guards (appended)

## A) Serena MCP — Concrete Setup & Session Rules
**Claude must auto-load the `serena` MCP server.** Provide one of the following:

1) **Claude Desktop (GUI)**
- Settings → *Developer* → *Model Context Protocol (MCP) Servers* → **Add server**
  - **Name:** `serena`
  - **Command:** `serena` (or absolute path)
  - **Args:** `["serve"]` (or your server’s start args)
  - **Env (optional):** `SERENA_API_KEY`, etc.

2) **Project config file (checked in):** `.claude/mcp/serena.json`
```json
{
  "name": "serena",
  "command": "serena",
  "args": ["serve"],
  "env": {
    "SERENA_API_KEY": "aws:secretsmanager:serena_api_key"
  }
}
```

3) **Session preflight hook** (`/primer` must verify):
- Fail the session if `serena` is not listed in `loaded_mcp_servers`.
- Print actionable steps to enable it (use (1) or (2) above).

**Usage policy**
- `serena` may be used for: structured planning, requirement checks, and compliance traceability.
- Never send secrets or raw artifact bytes to `serena` unless explicitly allowed in `PLANNING.md`.

---

## B) Policy-as-Code for Infra Guardrails (CI gating)
Add a mandatory CI step **before deploy**:
- **Static checks:** `checkov` or `tfsec` on `infra/` to block merges when:
  - S3 bucket missing **Object Lock (Compliance)** or **Versioning**.
  - Missing **aws:SecureTransport** condition on S3 Bucket Policy.
  - KMS key policy too broad (e.g., `Principal:"*"`).
  - CloudTrail **data events** not enabled for the artifacts bucket.
- **Fmt/validate/plan:** `terraform fmt -check && terraform validate && terraform plan` (plan uploaded to PR).

Bucket policy snippets (examples the agent can reuse):
```hcl
# Enforce TLS-only
Condition = { Bool = { "aws:SecureTransport" = "true" } }

# Deny unencrypted object puts (if ever using client-side SSE options)
Condition = { StringNotEquals = { "s3:x-amz-server-side-encryption" = "aws:kms" } }
```

---

## C) Supply Chain & Reproducibility
- Generate **SBOM** for Python and container images (e.g., `pip-audit`, `syft`).
- **Pin dependencies**; enable Renovate (or Dependabot) with weekly schedules.
- Verify image digest in deploys; sign container images (cosign, optional).
- Use `--require-hashes` in `pip` (or uv lockfile) for deterministic installs.

---

## D) OpenAPI Contract Tests & Golden Files
- Keep `docs/openapi.yaml` as the source of truth.
- Add a test that **loads the OpenAPI** and ensures all routers are covered and schemas match.
- Golden-file test: snapshot the OpenAPI; diff on PR to catch breaking changes.

---

## E) Security Tests (JWT & PII)
- Test that **`userId` is derived from JWT** and request bodies’ `userId` are ignored or validated.
- Add a **PII linter** step that fails on printing `Authorization`, cookies, or `.secret`-like keys in logs.

---

## F) S3 Object Lock Enforcement Hints
- At runtime, the API should refuse to operate if the artifacts bucket is not Object-Locked (startup check with a clear error).
- Provide a helper to **assert** object metadata includes `sha256`, `url`, `ts`, `scheduleId?`.
- Optional: enforce a minimum **retention period** via a config map keyed by `retentionClass`.

---

## G) Deployment Safety
- Use **Lambda aliases** with linear or canary traffic shifting.
- Maintain a **one-click rollback** by switching alias back to previous version.
- Keep a **CHANGELOG** entry with the artifact digest and Terraform state commit.

---

## H) Cost & Concurrency Controls
- Concurrency caps per function; alarms when throttles > 0.
- Optional **queue-based backpressure**: if capture duration p95 rises, reduce scheduler fan-out.
- Budget alarms via AWS Budgets + SNS.

---

## I) Evidence Bundle Tooling
- Add `tools/evidence_bundle.py` to export `/manifest.json`, metadata, CloudTrail snippets and a `verify.py` script.
- Provide a CLI command in `Makefile` → `make evidence CAPTURE_IDS=...`.

---

## J) Repo Hygiene
- Add `.github/ISSUE_TEMPLATE` and `PULL_REQUEST_TEMPLATE.md` that includes the **compliance checklist** (Object Lock, KMS, CloudTrail).
- Add `CODEOWNERS` (security leads own `infra/modules/artifacts_bucket`, `kms`, and `api/auth`).

---

## K) Deterministic Rendering Extras
- Disable CSS/JS animations if possible for PDF (reduce diffs).
- Install common fonts; embed fonts in PDF where feasible.
- Normalize timezones (set TZ in container); record TZ in metadata.

---

## L) CI Example (aggregated)
```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v1
      - run: uv sync
      - run: uv run ruff check . && uv run mypy src/ && uv run pytest -q
      - name: IaC checks
        run: |
          terraform -chdir=infra fmt -check
          terraform -chdir=infra validate
          terraform -chdir=infra plan -out=tfplan
          pipx install checkov || true
          checkov -d infra
      - name: SBOM & vuln scan
        run: |
          pipx install pip-audit || true
          pip-audit -r requirements.txt || true
```

---

## M) Quick Tests the Agent Must Add For New Endpoints
- **Auth**: rejects missing/invalid JWT; ignores `userId` in body.
- **Presigned download**: TTL <= 15m; URL uses correct bucket/key.
- **Verify**: recomputes SHA‑256 from S3 bytes and matches DDB/metadata; mismatch returns `{ ok:false, expected, actual }`.

---

## N) Makefile Quality-of-Life
```
.PHONY: lint test plan build-image

lint:
\tuv run ruff check . && uv run mypy src/

test:
\tuv run pytest -q

plan:
\tterraform -chdir=infra fmt -check && terraform -chdir=infra validate && terraform -chdir=infra plan

build-image:
\tdocker build -t csa-capture:dev src/capture
```
