# Execute PRP — Compliance Screenshot Archiver (CSA)

**Input:** `$ARGUMENTS` (path to the PRP file to execute)

> Purpose: Perform a one-pass, production-grade implementation that *cannot* complete until all CSA validation gates and compliance guardrails are green. This command is opinionated for CSA: WORM/Object Lock, KMS, CloudTrail data events, JWT scoping, and deterministic Playwright captures.

---

## 0) Preflight (MUST pass before doing any work)
1. **Load core context**: `CLAUDE.md`, `INITIAL.md`, `docs/CSA-Spec.md`, `docs/CSA-Design.md`, and the PRP file at `$ARGUMENTS`.
2. **Serena MCP check**: fail fast if `serena` MCP is not loaded (print steps to enable). Record `loaded_mcp_servers` in the log.
3. **Branching**: create a working branch `feat/<slug-from-prp>`.
4. **Environment sanity**: ensure `uv` available, Python 3.12, Docker, Terraform; print versions.
5. **Planning artifact**: append/refresh `PLANNING.md` + `TASK.md` with the PRP’s goal, acceptance criteria, and a task list (use TodoWrite).

---

## 1) ULTRATHINK & Plan (file-level)
- Summarize the PRP in ≤10 bullets.
- Produce a **file-level plan** (create/modify lists). Include tests and Terraform.
- Identify patterns to mirror from the best modern architectural practices
- Note **security/compliance hotspots** to verify: S3 **Object Lock**, SSE-KMS CMK usage, **CloudTrail S3 data events**, JWT → `userId` derivation, presigned URL TTL ≤ 15m.
- Decide an **execution order**: smallest vertical slice to green first.

> **Block** if the PRP lacks Purpose/Why (compliance + WORM), architecture path, data models, guardrails, and executable gates. Ask to regenerate the PRP or extend it inline before proceeding.

---

## 2) Execute (small slices → green)
Follow the plan in small PR-sized commits. For each slice:
1. **Tests first**: write/extend unit tests (models/utils/routers) and moto tests for S3/DDB; add Playwright stub tests if capture path touched.
2. **Code**: implement minimal code to satisfy tests.
3. **Infra**: update Terraform modules when needed (artifacts bucket, DDB, API, roles). Keep changes isolated.
4. **Docs**: update `docs/openapi.yaml` if endpoints changed; update `CHANGELOG.md` as needed.

---

## 3) Validation Suite (must be executable & green)
Run these after **every** slice and at the end:

### 3.1 Quality gates
```bash
uv run ruff check . && uv run mypy src/ && uv run pytest -q
