# Command: generate-prp

**Inputs:** `$ARGUMENTS` (path to `INITIAL.md` or a feature name)

## Goal
Create a **Product Requirements Prompt (PRP)** that enables a one-pass implementation by the AI agent. The PRP must bundle all critical context, research, patterns, and executable validation gates so the agent can self-validate and iterate to green.

---

## Read First (Context to Load)
- `CLAUDE.md` (project guardrails)
- `INITIAL.md` (if `$ARGUMENTS` points to a file; else resolve feature by name under `tickets/` or `docs/tasks/`)
- `docs/CSA-Spec.md`, `docs/CSA-Design.md`
- Repo conventions (linters, tests, typing, Terraform layout)

If any file is missing, note it in PRP “Assumptions” and proceed with best practice defaults.

---

## Research Process

1) **Codebase Analysis**
- Search the repo for similar features/patterns.
- Identify concrete files to reference (routers, clients, Terraform modules, tests).
- Note conventions (naming, error handling, logging, dependency injection).
- Capture the **test pattern** (pytest layout, fixtures, how moto is used, where Playwright is stubbed).

2) **External Research**
- Find authoritative docs for the exact libraries/frameworks used (include **URLs**).
- Include at least one real implementation example (GitHub/blog/SO) per tricky area.
- Capture best practices & common pitfalls (timeouts, headless browser cold start, DDB keys, S3 Object Lock, KMS key policy).

3) **User Clarification (only if blocking)**
- If a hard ambiguity would change the design materially, enumerate the options and state the default you’ll take.

> **CRITICAL:** After exploring the codebase and sources, **ULTRATHINK**: draft the plan mentally, list risks, choose simplest path, then write the PRP.

---

## What the PRP MUST Include (CSA-specific)
- **Purpose / Why** explicitly tied to **compliance evidence** generation and **WORM** storage (immutability for screenshots as evidence).
- **Architecture (MVP path)**: API Gateway → FastAPI → Scheduler (EventBridge) → Capture Lambda (Playwright/Chromium) → **S3 (Object Lock) + DynamoDB**.
- **Data Models**: `Schedules`, `Captures` (include fields for SHA-256, timestamps, s3_key, user scoping, indexes).
- **Security & Ops Guardrails**:
  - IAM least-privilege for every function (API, scheduler, capture).
  - **KMS** (SSE-KMS CMK) with scoped key policy.
  - **S3 Object Lock (Compliance mode)** + versioning + lifecycle to Glacier.
  - **Audit logging**: CloudTrail **S3 data events** enabled; structured app logs; alarms on failure/backlog.
- **Validation Gates (Executable)**
  - Syntax/typing:  
    ```bash
    uv run ruff check . && uv run mypy src/
    ```
  - Unit tests (with **moto** for S3/DynamoDB; **Playwright stub** for capture):  
    ```bash
    uv run pytest -q
    ```
  - **E2E Smoke (mocked backends)**: on-demand capture → produce PDF bytes → compute SHA-256 → `put_object` to mocked S3 with metadata → write DynamoDB item → `GET /captures/{id}/verify` returns OK.
- **Deliverables**: code changes, tests, Terraform diffs, runbook notes, and a **rollback plan** (what to revert/how).
  
---

## Create PRP

### Feature file: `$ARGUMENTS`
Generate a complete PRP for general feature implementation with thorough **research**. Ensure context is passed to the AI agent to enable self-validation and iterative refinement. **Read the feature file first** to understand what needs to be created, how the examples provided help, and any other considerations.

The AI agent only gets the context you append to the PRP and its training data. **Assume the agent has repo access and web search**; therefore include or reference **documentation URLs** and **example links** it can open.

---

## PRP Structure (Template to Fill)

### 1) Feature Summary
- In one paragraph: what, why (compliance evidence + WORM), success criteria, out-of-scope.

### 2) Architecture & Flows (CSA)
- Describe the exact path touched: API Gateway → FastAPI → EventBridge Scheduler → Capture Lambda (Playwright) → S3 (Object Lock) + DDB.
- Include sequence of calls, timeouts, retries, and idempotency keys.

### 3) Data Models
- **Schedules**: keys, attributes (`id`, `user_id`, `url`, `cron`, `timezone`, `retention_class`, `next_run_at`, etc.), PK/SK, GSI(s).
- **Captures**: keys, attributes (`id`, `schedule_id`, `user_id`, `s3_key`, `sha256`, `format`, `timestamp`, `status`, etc.), PK/SK, GSI(s).
- Hashing: compute **SHA-256** for every artifact; store in DDB and S3 object metadata.

### 4) Security & Compliance
- IAM policy snippets (least-privilege for DDB Put/Get/Query, S3 Put/Get with bucket restriction, Lambda invoke).
- S3 bucket requirements: **Object Lock (Compliance mode)**, versioning, lifecycle.
- **KMS** CMK ARN usage and key policy constraints.
- **CloudTrail** S3 data events + logging fields to include.

### 5) Implementation Blueprint
- **Pseudocode** for core changes (routers/handlers, capture function, hashing, S3 put with metadata, DDB writes).
- **File-level plan** (list files to create/modify; reference similar files in repo).
- **Error handling** (timeouts, retries, DLQ, partial-write rollback).
- **Observability** (metrics, logs, alarms).
- **Tasks in order** (smallest steps first to reach green).

### 6) External References
- Library docs & examples **(paste URLs)** for: FastAPI route patterns, Playwright PDF generation, boto3 S3 `put_object` (metadata, SSE-KMS), DynamoDB `PutItem/Query`, EventBridge rules, moto usage for S3/DynamoDB.

### 7) Validation Gates (copy-paste runnable)
```bash
# Lint & Type
uv run ruff check . && uv run mypy src/

# Tests (unit + integration)
uv run pytest -q
