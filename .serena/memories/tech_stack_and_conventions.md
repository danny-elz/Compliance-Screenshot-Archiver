# Tech Stack and Code Conventions

## Technology Stack

### Backend
- **Language**: Python 3.12
- **Framework**: FastAPI with Pydantic v2 models
- **Runtime**: AWS Lambda (API) + Lambda Container Images (Capture)
- **Authentication**: AWS Cognito + JWT
- **Capture Engine**: Playwright with headless Chromium

### Frontend  
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui (Radix + Tailwind CSS)
- **Build Tool**: Vite
- **Hosting**: S3 static site + CloudFront

### AWS Infrastructure
- **Storage**: S3 (Object Lock + KMS), DynamoDB
- **Compute**: Lambda, API Gateway
- **Scheduling**: EventBridge
- **Security**: Cognito, KMS, Secrets Manager, CloudTrail
- **Monitoring**: CloudWatch (logs, metrics, alarms)
- **Queue**: SQS (optional fan-out), with DLQ
- **IaC**: Terraform

### Development Tools
- **Package Manager**: uv (preferred) or poetry
- **Linting**: ruff + mypy + bandit
- **Formatting**: black
- **Testing**: pytest + pytest-asyncio
- **Mocking**: moto (AWS services), responses/httpx
- **Pre-commit**: Configured with all quality tools

## Code Style Conventions
- **PEP8** compliance with type hints everywhere
- **Google-style docstrings** for all functions
- **Max 500 LOC per file** - refactor before exceeding
- **Relative imports** within packages
- **JSON-structured logging** with request/capture IDs
- **Error handling** with consistent error envelopes

## Security Standards
- **Least-privilege IAM** for all functions
- **S3 Object Lock (Compliance mode)** for WORM storage
- **KMS CMK encryption** for all sensitive data
- **JWT authentication** with Cognito
- **No secrets in logs** - use Secrets Manager
- **CloudTrail S3 data events** enabled
- **Presigned URLs** with short TTL (≤15 minutes)

## File Structure
```
app/
  api/              # FastAPI routers, DTOs  
  auth/             # Cognito/JWT verification, RBAC
  capture_engine/   # Playwright orchestration
  scheduling/       # EventBridge handlers
  storage/          # S3, DynamoDB adapters
  domain/           # Pydantic models, business logic
  core/             # config, logging, error handling
infra/              # Terraform infrastructure
tests/              # pytest suites mirroring app/
docs/               # design docs, API specs, runbooks
```