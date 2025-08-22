# Compliance Screenshot Archiver (CSA)

**Enterprise-grade automated web content archiving for compliance and regulatory requirements.**

The Compliance Screenshot Archiver is a production-ready system that automates the capture and archiving of webpage screenshots and PDFs for compliance and audit purposes. It provides cryptographically-verified, immutable evidence of web content with full audit trails.

## 📁 Repository Structure

This repository is organized for professional development and clear separation of concerns:

```
├── 📁 backend/              # Complete Python backend application
│   ├── app/                 # FastAPI application code
│   ├── tests/               # Comprehensive test suite
│   ├── infra/               # Terraform infrastructure as code
│   ├── scripts/             # Deployment and utility scripts
│   └── docker/              # Docker configurations
├── 📁 frontend/             # Frontend application (planned)
├── 📁 docs/                 # Project documentation
│   ├── compliance/          # Compliance and security docs
│   └── assets/              # Images and supporting materials
├── 📁 deployment/           # Deployment configurations
├── 📁 tools/                # Development tools and utilities
└── 📄 Core project files    # README, planning docs, etc.
```

## 🎯 Quick Start

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

## 🔒 Security & Compliance

This system implements enterprise-grade security:

- **🔐 Authentication:** AWS Cognito with JWT tokens
- **🛡️ Authorization:** Role-based access control (Admin/Operator/Viewer)
- **🔒 Encryption:** KMS encryption for all data at rest and in transit
- **📝 Immutability:** S3 Object Lock in Compliance mode (cannot be disabled)
- **📋 Audit Trail:** Complete CloudTrail logging with Object Lock protection
- **✅ Verification:** SHA-256 hash verification for all captured content

### Compliance Standards
- **SEC 17a-4:** Electronic record retention requirements
- **SOC 2 Type II:** Security and availability controls
- **WORM Storage:** Write-once, read-many with legal defensibility

## 💰 Business Value

The CSA system addresses a **$15M market opportunity** in enterprise compliance:

- **Target Market:** Enterprise legal, compliance, and audit teams
- **Pricing Model:** $299-4,999/month SaaS tiers
- **Value Proposition:** Legal-defensible evidence vs. basic screenshots
- **Competitive Advantage:** 10-100x higher value than commodity screenshot APIs

See [docs/Future-Prospects.md](docs/Future-Prospects.md) for complete market analysis.

## 📊 Project Status

**Current State:** Production-ready backend with comprehensive test coverage
- ✅ **Core Features:** All MUST requirements implemented
- ✅ **Infrastructure:** Complete Terraform configurations
- ✅ **Security:** Enterprise-grade compliance controls
- ✅ **Testing:** 92 tests passing with 75% coverage
- 📋 **Frontend:** Planned implementation

## 🤝 Contributing

This project follows professional development standards:

1. **Read the specs:** Review CSA-Spec.md and CSA-Design.md first
2. **Check tasks:** See TASK.md for current priorities
3. **Follow standards:** Use ruff/mypy for code quality
4. **Write tests:** Maintain test coverage above 75%
5. **Security first:** Never compromise compliance requirements

## 📞 Support

For questions or issues:
- **Documentation:** See docs/ directory
- **Tasks & Planning:** Check TASK.md and PLANNING.md
- **Architecture:** Review CSA-Design.md
- **Business Case:** See Future-Prospects.md

---

**Status:** Production-ready backend, frontend development planned
