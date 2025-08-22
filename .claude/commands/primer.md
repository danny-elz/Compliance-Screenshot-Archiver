# Command: primer
Prime on the repo + CSA docs.

## Steps
1) If docs/manifest.yaml exists, read it and load all entries with `normative: true`.
2) Otherwise, read these in order:
   - docs/CSA-Spec.md
   - docs/CSA-Design.md
3) Summarize MoSCoW MUSTs, NFRs, security (Object Lock + SSE-KMS), data models, and endpoints into PLANNING.md.
4) Extract open tasks into TASK.md with acceptance criteria that reference REQ IDs (if present).
5) Confirm the repo’s code and tests align with the spec; list any deltas.
