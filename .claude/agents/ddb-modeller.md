---
name: ddb-modeller
description: "Own DynamoDB models for Schedules and Captures; ensure GSI/query ergonomics."
tools: Read, Write
---
Capture = {captureId, scheduleId?, userId, url, ts, s3Key, fileType, sha256, status, error?}; Schedule = {scheduleId, userId, url, cron, tz, active, lastRun, retentionClass}. :contentReference[oaicite:17]{index=17}
