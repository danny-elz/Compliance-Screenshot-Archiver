# Compliance Screenshot Archiver - Testing Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Suite Overview](#test-suite-overview)
3. [Local Development Testing](#local-development-testing)
4. [Component Testing](#component-testing)
5. [Integration Testing](#integration-testing)
6. [AWS Infrastructure Testing](#aws-infrastructure-testing)
7. [End-to-End Testing](#end-to-end-testing)
8. [Authentication Testing](#authentication-testing)
9. [Performance Testing](#performance-testing)
10. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

1. **Python 3.12+** installed
2. **UV package manager** (for dependency management)
3. **AWS CLI** configured (for integration tests)
4. **Terraform** (for infrastructure tests)
5. **Node.js** (for Playwright browser automation)

### Initial Setup

```bash
# Clone and navigate to the project
cd /Users/dannyelzein/Desktop/Python/Compliance-Screenshot-Archiver

# Install dependencies
uv sync --dev

# Install Playwright browsers
uv run playwright install chromium

# Copy environment file
cp .env .env
```

### Run All Tests (Local)

```bash
# Run the complete test suite with mocked AWS services
uv run pytest

# Run with verbose output
uv run pytest -v

# Run with coverage report
uv run pytest --cov=app --cov-report=html
```

## Test Suite Overview

### Test Structure

```
tests/
├── conftest.py              # Test fixtures and configuration
├── test_auth.py             # Authentication unit tests
├── test_api_captures.py     # API endpoint tests
├── test_capture_engine.py   # Screenshot/PDF capture tests
├── test_storage_dynamo.py   # DynamoDB storage tests
├── test_storage_s3.py       # S3 storage tests
└── test_integration_auth.py # Authentication integration tests
```

### Test Types

- **Unit Tests**: Individual component testing with mocks
- **Integration Tests**: Component interaction testing
- **API Tests**: FastAPI endpoint testing
- **Infrastructure Tests**: Terraform validation
- **End-to-End Tests**: Complete workflow testing

## Local Development Testing

### 1. Run Unit Tests Only

```bash
# Run specific test files
uv run pytest tests/test_auth.py -v
uv run pytest tests/test_capture_engine.py -v
uv run pytest tests/test_storage_s3.py -v

# Run specific test classes
uv run pytest tests/test_api_captures.py::TestTriggerCapture -v

# Run specific test methods
uv run pytest tests/test_api_captures.py::TestTriggerCapture::test_trigger_capture_success -v
```

### 2. Test with Mock Services

The test suite uses `moto` for AWS service mocking. All tests run locally without real AWS resources:

```bash
# Run all tests with AWS mocks (default behavior)
uv run pytest

# Run with detailed mock information
uv run pytest -v -s
```

### 3. Test Environment Variables

Tests automatically set up mock environment variables. To override:

```bash
# Set custom test environment
export APP_ENV=test
export AWS_REGION=us-east-1
export S3_BUCKET_ARTIFACTS=test-artifacts-bucket

uv run pytest
```

## Component Testing

### 1. Authentication Component

```bash
# Test JWT token validation
uv run pytest tests/test_auth.py -v

# Test authentication dependencies
uv run pytest tests/test_integration_auth.py -v

# Test with real Cognito (requires setup)
python scripts/test_auth.py --token "your-jwt-token"
```

### 2. Capture Engine Testing

```bash
# Test screenshot/PDF capture (uses mocked Playwright)
uv run pytest tests/test_capture_engine.py -v

# Test specific capture formats
uv run pytest tests/test_capture_engine.py::TestCaptureEngine::test_capture_pdf -v
uv run pytest tests/test_capture_engine.py::TestCaptureEngine::test_capture_png -v
```

### 3. Storage Layer Testing

```bash
# Test S3 operations
uv run pytest tests/test_storage_s3.py -v

# Test DynamoDB operations
uv run pytest tests/test_storage_dynamo.py -v

# Test storage integration
uv run pytest tests/test_storage_*.py -v
```

### 4. API Endpoint Testing

```bash
# Test all API endpoints
uv run pytest tests/test_api_captures.py -v

# Test specific endpoints
uv run pytest tests/test_api_captures.py::TestTriggerCapture -v
uv run pytest tests/test_api_captures.py::TestDownloadCapture -v
uv run pytest tests/test_api_captures.py::TestVerifyCapture -v
```

## Integration Testing

### 1. Local FastAPI Server Testing

```bash
# Start the development server
uv run uvicorn app.main:app --reload --port 8000

# In another terminal, test endpoints
curl -X GET "http://localhost:8000/api/health"

# Test capture trigger (requires authentication)
curl -X POST "http://localhost:8000/api/captures/trigger" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "url=https://example.com&artifact_type=pdf"
```

### 2. Test with Real AWS Services

#### Setup AWS Environment

```bash
# Copy and configure environment
cp .env .env
# Edit .env with your AWS resources:
# S3_BUCKET_ARTIFACTS=your-real-bucket
# KMS_KEY_ARN=your-real-kms-key
# DDB_TABLE_SCHEDULES=your-schedules-table
# DDB_TABLE_CAPTURES=your-captures-table
```

#### Run Integration Tests

```bash
# Set environment to use real AWS (not recommended for CI)
export USE_REAL_AWS=true
uv run pytest tests/test_integration_*.py -v

# Or run specific integration scenarios
uv run pytest tests/test_integration_auth.py -v
```

## AWS Infrastructure Testing

### 1. Validate Terraform Configuration

```bash
cd infra

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment (dry run)
terraform plan

# Check formatting
terraform fmt -check
```

### 2. Deploy Test Environment

```bash
cd infra

# Copy variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Deploy test environment
terraform apply -var-file="terraform.tfvars"

# Test deployed resources
aws s3 ls s3://your-artifacts-bucket
aws dynamodb list-tables
aws cognito-idp list-user-pools
```

### 3. Test Infrastructure Components

```bash
# Test S3 bucket configuration
aws s3api get-bucket-versioning --bucket your-artifacts-bucket
aws s3api get-object-lock-configuration --bucket your-artifacts-bucket

# Test DynamoDB tables
aws dynamodb describe-table --table-name your-schedules-table
aws dynamodb describe-table --table-name your-captures-table

# Test Lambda function
aws lambda list-functions --query 'Functions[?contains(FunctionName, `screenshot-archiver`)]'
```

## End-to-End Testing

### 1. Complete Capture Workflow

```bash
# 1. Start the application
uv run uvicorn app.main:app --port 8000

# 2. Get authentication token (if using Cognito)
# Use AWS Cognito CLI or web interface to get JWT token

# 3. Test complete capture workflow
export JWT_TOKEN="your-jwt-token"

# Trigger a capture
CAPTURE_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/captures/trigger" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "url=https://example.com&artifact_type=pdf")

echo $CAPTURE_RESPONSE

# Extract capture ID
CAPTURE_ID=$(echo $CAPTURE_RESPONSE | jq -r '.capture_id')

# Get capture details
curl -X GET "http://localhost:8000/api/captures/$CAPTURE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Download capture
curl -X GET "http://localhost:8000/api/captures/$CAPTURE_ID/download" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Verify capture
SHA256=$(echo $CAPTURE_RESPONSE | jq -r '.sha256')
curl -X POST "http://localhost:8000/api/captures/verify" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "sha256=$SHA256"
```

### 2. Automated E2E Test Script

Create a test script for automated end-to-end testing:

```bash
#!/bin/bash
# Save as scripts/e2e_test.sh

set -e

echo "Starting End-to-End Test..."

# Check if server is running
if ! curl -s http://localhost:8000/api/health > /dev/null; then
    echo "Starting FastAPI server..."
    uv run uvicorn app.main:app --port 8000 &
    SERVER_PID=$!
    sleep 5
fi

# Run E2E tests
echo "Running E2E capture workflow..."

# Test URLs
TEST_URLS=("https://example.com" "https://httpbin.org/html")

for url in "${TEST_URLS[@]}"; do
    echo "Testing capture for: $url"
    
    # Trigger PDF capture
    RESPONSE=$(curl -s -X POST "http://localhost:8000/api/captures/trigger" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "url=$url&artifact_type=pdf")
    
    echo "Response: $RESPONSE"
    
    # Extract and verify capture ID
    CAPTURE_ID=$(echo $RESPONSE | jq -r '.capture_id')
    if [ "$CAPTURE_ID" != "null" ]; then
        echo "✅ Capture successful: $CAPTURE_ID"
    else
        echo "❌ Capture failed for $url"
        exit 1
    fi
done

echo "✅ E2E test completed successfully"

# Cleanup
if [ ! -z "$SERVER_PID" ]; then
    kill $SERVER_PID
fi
```

## Authentication Testing

### 1. Test JWT Token Validation

```bash
# Use the provided test script
python scripts/test_auth.py --token "your-jwt-token-here"
```

### 2. Test Different User Roles

```bash
# Test operator role (can trigger captures)
curl -X POST "http://localhost:8000/api/captures/trigger" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d "url=https://example.com&artifact_type=pdf"

# Test viewer role (can only view captures)
curl -X GET "http://localhost:8000/api/captures" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```

### 3. Test Authentication Errors

```bash
# Test invalid token
curl -X GET "http://localhost:8000/api/captures" \
  -H "Authorization: Bearer invalid-token"

# Test missing token
curl -X GET "http://localhost:8000/api/captures"

# Test expired token
curl -X GET "http://localhost:8000/api/captures" \
  -H "Authorization: Bearer $EXPIRED_TOKEN"
```

## Performance Testing

### 1. Load Testing with curl

```bash
# Test concurrent captures
for i in {1..10}; do
    curl -X POST "http://localhost:8000/api/captures/trigger" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -d "url=https://example.com&artifact_type=pdf" &
done
wait
```

### 2. Memory and Performance Profiling

```bash
# Install profiling tools
uv add --dev memory-profiler line-profiler

# Run tests with memory profiling
uv run python -m memory_profiler tests/test_capture_engine.py

# Profile specific functions
uv run kernprof -l -v app/capture_engine/engine.py
```

### 3. Database Performance Testing

```bash
# Test DynamoDB query performance
uv run pytest tests/test_storage_dynamo.py::TestDynamoStorage::test_list_captures_performance -v

# Test S3 upload/download performance
uv run pytest tests/test_storage_s3.py::TestS3Storage::test_upload_performance -v
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Test Environment Issues

**Problem**: Tests fail with "AWS credentials not found"
```bash
# Solution: Set mock credentials
export AWS_ACCESS_KEY_ID=testing
export AWS_SECRET_ACCESS_KEY=testing
export AWS_DEFAULT_REGION=us-east-1
```

**Problem**: Playwright browser not found
```bash
# Solution: Install browsers
uv run playwright install chromium
```

#### 2. Authentication Issues

**Problem**: JWT token validation fails
```bash
# Check environment variables
echo $COGNITO_USER_POOL_ID
echo $COGNITO_CLIENT_ID

# Validate token manually
python scripts/test_auth.py --token "$YOUR_TOKEN"
```

**Problem**: JWKS URL not accessible
```bash
# Test JWKS URL connectivity
curl https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/jwks.json
```

#### 3. Capture Engine Issues

**Problem**: Screenshot capture fails
```bash
# Check Playwright installation
uv run python -c "from playwright.async_api import async_playwright; print('Playwright OK')"

# Test with mock disabled
uv run pytest tests/test_capture_engine.py -v -s --no-mock-playwright
```

#### 4. Storage Issues

**Problem**: S3 operations fail in tests
```bash
# Verify moto mock is working
uv run python -c "from moto import mock_s3; print('Moto S3 mock available')"

# Check bucket configuration in tests
uv run pytest tests/test_storage_s3.py::TestS3Storage::test_create_bucket -v -s
```

#### 5. Infrastructure Issues

**Problem**: Terraform plan fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Validate Terraform syntax
cd infra && terraform validate

# Check required variables
terraform console
```

### Debug Mode Testing

```bash
# Run tests with debug output
uv run pytest -v -s --log-cli-level=DEBUG

# Run specific test with pdb debugger
uv run pytest tests/test_api_captures.py::TestTriggerCapture::test_trigger_capture_success -v -s --pdb

# Run with coverage and debug
uv run pytest --cov=app --cov-report=html --log-cli-level=DEBUG
```

### Test Data Cleanup

```bash
# Clear test cache
rm -rf .pytest_cache __pycache__ tests/__pycache__

# Clear coverage data
rm -f .coverage htmlcov

# Reset test environment
export APP_ENV=test
uv run pytest --cache-clear
```

## Continuous Integration

### GitHub Actions Testing

The project includes GitHub Actions workflows. To test CI locally:

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run CI tests locally
act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Run all hooks manually
pre-commit run --all-files

# Test specific hooks
pre-commit run black
pre-commit run ruff
pre-commit run mypy
```

## Test Coverage Goals

- **Unit Tests**: >90% code coverage
- **Integration Tests**: All critical paths covered
- **API Tests**: All endpoints tested
- **Authentication**: All roles and error cases tested
- **Storage**: All CRUD operations tested
- **Capture Engine**: All artifact types tested

Monitor coverage with:

```bash
uv run pytest --cov=app --cov-report=html --cov-fail-under=90
open htmlcov/index.html  # View coverage report
```

This comprehensive testing guide ensures your Compliance Screenshot Archiver application is thoroughly tested at every level, from individual components to complete end-to-end workflows.