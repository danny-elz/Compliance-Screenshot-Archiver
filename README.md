# Compliance Screenshot Archiver (CSA)

**Enterprise-grade automated web content archiving for compliance and regulatory requirements.**

The Compliance Screenshot Archiver is a production-ready system that automates the capture and archiving of webpage screenshots and PDFs for compliance and audit purposes. It provides cryptographically-verified, immutable evidence of web content with full audit trails.

## Repository Structure

This repository is organized for professional development and clear separation of concerns:

```
├── backend/                 # Complete Python backend application
│   ├── app/                 # FastAPI application code
│   ├── tests/               # Comprehensive test suite
│   ├── infra/               # Terraform infrastructure as code
│   ├── scripts/             # Deployment and utility scripts
│   └── docker/              # Docker configurations
├── frontend/                # React TypeScript frontend application
├── docs/                    # Project documentation
│   ├── compliance/          # Compliance and security docs
│   └── assets/              # Images and supporting materials
├── deployment/              # Deployment configurations
├── tools/                   # Development tools and utilities
└── Core project files       # README, planning docs, etc.
```

## Quick Start

### Prerequisites
- Python 3.12+
- AWS CLI configured
- Terraform 1.0+
- Docker (for containerized components)

### 1. Backend Development
```bash
cd backend
uv sync                      # Install dependencies
uv run pytest               # Run tests
uv run ruff check .          # Lint code
```

### 2. Infrastructure Deployment
```bash
cd backend/infra
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply
```

### 3. Local Development
```bash
cd backend
uv run python -m app.main   # Start API server
```

## 📋 Authoritative Documentation
- **Requirements Specification:** [docs/CSA-Spec.md](docs/CSA-Spec.md)
- **System Design:** [docs/CSA-Design.md](docs/CSA-Design.md)
- **Market Analysis:** [docs/Future-Prospects.md](docs/Future-Prospects.md)
- **Implementation Tasks:** [TASK.md](TASK.md)
- **Project Planning:** [PLANNING.md](PLANNING.md)

## 🏗️ System Architecture

**Technology Stack:**
- **Backend:** Python 3.12, FastAPI, Playwright/Chromium
- **Infrastructure:** AWS (Lambda, S3, DynamoDB, EventBridge, Cognito)
- **Security:** S3 Object Lock (Compliance mode), KMS encryption, JWT authentication
- **Deployment:** Terraform, Docker, GitHub Actions

**Key Features:**
- ✅ Scheduled and on-demand webpage captures
- ✅ PDF/PNG export with SHA-256 hash verification
- ✅ Immutable storage with 7-year retention
- ✅ Enterprise authentication and RBAC
- ✅ Complete audit trails and compliance reporting
- ✅ RESTful API and dashboard interface

## 🚀 Development Workflow

### For Backend Development
```bash
cd backend

# Install dependencies
uv sync

# Run development server
uv run python -m app.main

# Run tests
uv run pytest

# Code quality checks
uv run ruff check .
uv run mypy app/

# Deploy infrastructure
cd infra && terraform apply
```

### For Frontend Development (Future)
```bash
cd frontend
# Frontend implementation planned
# See frontend/README.md for details
```

## Deployment

### AWS Infrastructure

The system requires the following AWS resources:

- **S3 Bucket**: With Object Lock enabled for compliance
- **DynamoDB Tables**: For metadata storage
- **IAM Roles**: With appropriate S3 and DynamoDB permissions

### Production Deployment

1. **Setup AWS Infrastructure**
   ```bash
   # Create S3 bucket with Object Lock
   aws s3 mb s3://your-csa-artifacts-bucket
   aws s3api put-object-lock-configuration \
     --bucket your-csa-artifacts-bucket \
     --object-lock-configuration ObjectLockEnabled=Enabled
   ```

2. **Deploy Backend**
   - Configure production environment variables
   - Deploy to your preferred hosting service (ECS, Lambda, etc.)

3. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy dist/ to your web hosting service
   ```

## Compliance

This system is designed to meet regulatory requirements for electronic record keeping:

- **Immutable Storage**: S3 Object Lock prevents modification
- **Integrity Verification**: SHA-256 checksums for all content
- **Audit Trail**: Complete logging of capture and access events
- **Access Controls**: Role-based permissions and authentication

## License

Copyright (c) 2024. All rights reserved.
