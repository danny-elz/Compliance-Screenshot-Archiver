# Compliance Screenshot Archiver - Backend

This directory contains the complete backend implementation for the Compliance Screenshot Archiver system.

## Architecture

- **API**: FastAPI with JWT authentication and RBAC
- **Capture Engine**: Playwright/Chromium for PDF/PNG generation
- **Storage**: AWS S3 with Object Lock + DynamoDB
- **Infrastructure**: Complete Terraform configurations
- **Testing**: Comprehensive test suite with moto mocking

## Quick Start

```bash
# Install dependencies
uv sync

# Run tests
uv run pytest

# Start development server
uv run python -m app.main

# Deploy infrastructure
cd infra && terraform apply
```

## Structure

- `app/` - FastAPI application code
- `tests/` - Test suite mirroring app structure  
- `infra/` - Terraform infrastructure as code
- `scripts/` - Deployment and utility scripts
- `docker/` - Docker configurations

See the main README.md in the repository root for complete documentation.