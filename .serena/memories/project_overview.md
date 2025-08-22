# Compliance Screenshot Archiver (CSA) - Project Overview

## Purpose
The Compliance Screenshot Archiver is a production-grade system that automates webpage captures (PDF/PNG) for compliance and audit purposes. It provides immutable, verifiable evidence of web content at specific points in time through:

- Scheduled and on-demand webpage captures
- SHA-256 hash integrity verification
- WORM (Write Once Read Many) storage using S3 Object Lock
- RESTful API and web dashboard
- Complete audit trail and compliance evidence generation

## Primary Users
- Compliance officers
- Audit teams  
- Risk management teams
- Legal teams
- Operations teams requiring "what was shown" evidence

## MVP Scope
- PDF export (primary) and PNG image capture
- Hash validation (SHA-256) with verify endpoint
- Scheduling via EventBridge and on-demand capture
- Dashboard for listing, viewing, and verifying captures
- REST API for all core functionality
- AWS-first architecture with cost efficiency focus

## Out of Scope (MVP)
- Full-site crawling or spidering
- Video capture
- Browser extensions
- Non-AWS deployment targets
- Advanced visual diffing or analytics

## Architecture Overview
Frontend (React + shadcn/ui) → API Gateway → FastAPI (Lambda) → EventBridge Scheduler → Capture Lambda (Playwright/Chromium) → S3 (Object Lock) + DynamoDB

## Key Compliance Requirements
- S3 Object Lock (Compliance mode) for immutability
- CloudTrail with S3 data events enabled
- KMS CMK encryption for all storage
- 7+ year retention capabilities
- Complete audit trail and evidence bundles