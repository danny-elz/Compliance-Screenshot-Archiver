# CSA Architecture Patterns and Code Examples

## Core Architecture Patterns

### 1. Domain-Driven Design Structure

The CSA application follows a clean architecture with domain-driven design:

```
app/
├── domain/          # Core business logic and entities
│   ├── models.py    # Domain models (Schedule, Capture, etc.)
│   └── events.py    # Domain events
├── api/             # API layer
│   ├── router.py    # FastAPI router configuration
│   └── routes/      # Endpoint implementations
├── capture_engine/  # Capture business logic
│   ├── engine.py    # Main capture orchestration
│   └── processor.py # Playwright integration
├── storage/         # Infrastructure layer
│   ├── dynamo.py    # DynamoDB operations
│   └── s3.py        # S3 operations
├── auth/            # Authentication & authorization
│   └── deps.py      # JWT validation and RBAC
└── core/            # Shared utilities
    ├── config.py    # Configuration management
    └── errors.py    # Error handling
```

### 2. FastAPI Application Pattern

```python
# app/api/router.py - Main application factory
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

def create_app() -> FastAPI:
    app = FastAPI(
        title="Compliance Screenshot Archiver",
        description="Automated web content archiving for compliance",
        version="1.0.0"
    )
    
    # Security middleware
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(CORSMiddleware, allow_origins=["*"])
    
    # Route registration
    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api/auth")
    app.include_router(schedules_router, prefix="/api/schedules")
    app.include_router(captures_router, prefix="/api/captures")
    
    return app
```

### 3. Dependency Injection Pattern

```python
# app/auth/deps.py - Authentication dependencies
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials,
            options={"verify_signature": False}  # Cognito verification
        )
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(
    user: dict = Depends(get_current_user)
) -> dict:
    if user.get("custom:role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
```

### 4. Domain Model Pattern

```python
# app/domain/models.py - Core business entities
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

class ArtifactType(str, Enum):
    PNG = "png"
    PDF = "pdf"
    BOTH = "both"

class CaptureStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Schedule(BaseModel):
    schedule_id: str = Field(..., description="Unique schedule identifier")
    url: str = Field(..., description="Target URL to capture")
    cron_expression: str = Field(..., description="Cron schedule")
    timezone: str = Field(default="UTC", description="Timezone for scheduling")
    artifact_type: ArtifactType = Field(..., description="Type of artifact to capture")
    viewport_width: int = Field(default=1920, description="Browser viewport width")
    viewport_height: int = Field(default=1080, description="Browser viewport height")
    wait_for_selector: Optional[str] = Field(None, description="CSS selector to wait for")
    tags: Dict[str, str] = Field(default_factory=dict, description="Metadata tags")
    retention_class: str = Field(default="standard", description="S3 retention class")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(..., description="User who created the schedule")
```

### 5. Storage Layer Pattern

```python
# app/storage/dynamo.py - DynamoDB operations with error handling
import boto3
from botocore.exceptions import ClientError
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class DynamoDBStorage:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
    
    async def create_schedule(self, schedule: Schedule) -> bool:
        try:
            response = self.table.put_item(
                Item=schedule.dict(),
                ConditionExpression='attribute_not_exists(schedule_id)'
            )
            logger.info(f"Created schedule {schedule.schedule_id}")
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                raise ValueError(f"Schedule {schedule.schedule_id} already exists")
            logger.error(f"Failed to create schedule: {e}")
            raise
    
    async def get_schedule(self, schedule_id: str) -> Optional[Schedule]:
        try:
            response = self.table.get_item(Key={'schedule_id': schedule_id})
            if 'Item' not in response:
                return None
            return Schedule(**response['Item'])
        except ClientError as e:
            logger.error(f"Failed to get schedule {schedule_id}: {e}")
            raise
```

### 6. Capture Engine Pattern

```python
# app/capture_engine/engine.py - Main orchestration
from playwright.async_api import async_playwright
import hashlib
import boto3
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class CaptureEngine:
    def __init__(self, s3_bucket: str, kms_key_id: str):
        self.s3_bucket = s3_bucket
        self.kms_key_id = kms_key_id
        self.s3_client = boto3.client('s3')
    
    async def capture_webpage(self, capture_request: CaptureRequest) -> CaptureResult:
        capture_id = self._generate_capture_id(capture_request)
        
        try:
            # Capture with Playwright
            artifact_data = await self._perform_capture(capture_request)
            
            # Compute hash
            content_hash = hashlib.sha256(artifact_data).hexdigest()
            
            # Store in S3 with Object Lock
            s3_key = await self._store_artifact(
                capture_id, artifact_data, capture_request.artifact_type
            )
            
            # Store metadata in DynamoDB
            capture_result = CaptureResult(
                capture_id=capture_id,
                url=capture_request.url,
                status=CaptureStatus.COMPLETED,
                s3_bucket=self.s3_bucket,
                s3_key=s3_key,
                content_hash=content_hash,
                captured_at=datetime.utcnow(),
                artifact_type=capture_request.artifact_type
            )
            
            await self._store_metadata(capture_result)
            return capture_result
            
        except Exception as e:
            logger.error(f"Capture failed for {capture_request.url}: {e}")
            await self._store_failure(capture_id, str(e))
            raise
    
    async def _perform_capture(self, request: CaptureRequest) -> bytes:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                ]
            )
            
            page = await browser.new_page(
                viewport={'width': request.viewport_width, 'height': request.viewport_height}
            )
            
            # Navigate and wait for stable content
            await page.goto(request.url, wait_until='networkidle')
            
            if request.wait_for_selector:
                await page.wait_for_selector(request.wait_for_selector)
            
            # Capture based on artifact type
            if request.artifact_type == ArtifactType.PNG:
                artifact_data = await page.screenshot(full_page=True, type='png')
            elif request.artifact_type == ArtifactType.PDF:
                artifact_data = await page.pdf(
                    format='A4',
                    print_background=True,
                    display_header_footer=True,
                    header_template='<div style="font-size:10px;">Captured: {{ timestamp }}</div>',
                    footer_template='<div style="font-size:10px;">{{ url }}</div>'
                )
            
            await browser.close()
            return artifact_data
```

### 7. Error Handling Pattern

```python
# app/core/errors.py - Comprehensive error handling
from fastapi import HTTPException
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class CSAError(Exception):
    """Base exception for CSA application"""
    def __init__(self, message: str, error_code: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class CaptureError(CSAError):
    """Raised when capture operation fails"""
    pass

class StorageError(CSAError):
    """Raised when storage operation fails"""
    pass

class AuthenticationError(CSAError):
    """Raised when authentication fails"""
    pass

def handle_csa_error(error: CSAError) -> HTTPException:
    """Convert CSA errors to HTTP exceptions"""
    status_map = {
        'CAPTURE_FAILED': 500,
        'STORAGE_FAILED': 500,
        'AUTH_FAILED': 401,
        'NOT_FOUND': 404,
        'VALIDATION_ERROR': 400,
        'RATE_LIMIT_EXCEEDED': 429,
    }
    
    status_code = status_map.get(error.error_code, 500)
    
    logger.error(f"CSA Error: {error.error_code} - {error.message}", extra=error.details)
    
    return HTTPException(
        status_code=status_code,
        detail={
            'error_code': error.error_code,
            'message': error.message,
            'details': error.details
        }
    )
```

### 8. Configuration Management Pattern

```python
# app/core/config.py - Environment-based configuration
from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # Environment
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    
    # AWS Configuration
    aws_region: str = "us-east-1"
    s3_artifacts_bucket: str
    s3_audit_bucket: str
    kms_key_id: str
    
    # DynamoDB Tables
    dynamodb_schedules_table: str = "csa-schedules"
    dynamodb_captures_table: str = "csa-captures"
    
    # Cognito Configuration
    cognito_user_pool_id: str
    cognito_client_id: str
    cognito_region: str = "us-east-1"
    
    # API Configuration
    api_rate_limit_per_minute: int = 60
    max_concurrent_captures: int = 100
    
    # Capture Engine Configuration
    default_viewport_width: int = 1920
    default_viewport_height: int = 1080
    capture_timeout_seconds: int = 300
    
    # Monitoring
    enable_xray_tracing: bool = True
    cloudwatch_log_group: str = "/aws/lambda/csa"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()
```

### 9. Lambda Handler Pattern

```python
# app/lambda_handler.py - AWS Lambda entry point
import json
import logging
from typing import Dict, Any
from app.capture_engine.engine import CaptureEngine
from app.domain.models import CaptureRequest
from app.core.config import settings
import asyncio

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize capture engine
capture_engine = CaptureEngine(
    s3_bucket=settings.s3_artifacts_bucket,
    kms_key_id=settings.kms_key_id
)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """AWS Lambda handler for capture operations"""
    try:
        # Parse event
        if 'Records' in event:
            # EventBridge scheduled capture
            return handle_scheduled_capture(event, context)
        else:
            # API Gateway on-demand capture
            return handle_api_capture(event, context)
            
    except Exception as e:
        logger.error(f"Lambda handler error: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'request_id': context.aws_request_id
            })
        }

def handle_scheduled_capture(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle EventBridge scheduled captures"""
    for record in event['Records']:
        try:
            # Extract capture request from EventBridge event
            detail = record.get('detail', {})
            capture_request = CaptureRequest(**detail)
            
            # Perform capture
            result = asyncio.run(capture_engine.capture_webpage(capture_request))
            
            logger.info(f"Scheduled capture completed: {result.capture_id}")
            
        except Exception as e:
            logger.error(f"Scheduled capture failed: {e}")
            # Send to DLQ for retry
            raise
    
    return {'statusCode': 200, 'body': 'Scheduled captures processed'}

def handle_api_capture(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle API Gateway on-demand captures"""
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        capture_request = CaptureRequest(**body)
        
        # Perform capture
        result = asyncio.run(capture_engine.capture_webpage(capture_request))
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'capture_id': result.capture_id,
                'status': result.status.value,
                'content_hash': result.content_hash,
                'captured_at': result.captured_at.isoformat()
            })
        }
        
    except ValueError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': f'Invalid request: {e}'})
        }
```

### 10. Testing Patterns

```python
# tests/test_capture_engine.py - Comprehensive testing
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from app.capture_engine.engine import CaptureEngine
from app.domain.models import CaptureRequest, ArtifactType

@pytest.fixture
def capture_engine():
    return CaptureEngine(
        s3_bucket="test-bucket",
        kms_key_id="test-key-id"
    )

@pytest.fixture
def sample_capture_request():
    return CaptureRequest(
        url="https://example.com",
        artifact_type=ArtifactType.PNG,
        viewport_width=1920,
        viewport_height=1080,
        schedule_id="test-schedule"
    )

@pytest.mark.asyncio
async def test_capture_webpage_success(capture_engine, sample_capture_request):
    """Test successful webpage capture"""
    with patch('app.capture_engine.engine.async_playwright') as mock_playwright:
        # Mock Playwright
        mock_page = AsyncMock()
        mock_page.screenshot.return_value = b'fake_image_data'
        mock_browser = AsyncMock()
        mock_browser.new_page.return_value = mock_page
        mock_playwright.return_value.__aenter__.return_value.chromium.launch.return_value = mock_browser
        
        # Mock S3
        with patch.object(capture_engine, '_store_artifact') as mock_store:
            mock_store.return_value = "test-key"
            
            with patch.object(capture_engine, '_store_metadata') as mock_metadata:
                result = await capture_engine.capture_webpage(sample_capture_request)
                
                assert result.status == "completed"
                assert result.content_hash is not None
                assert result.s3_key == "test-key"
                mock_page.goto.assert_called_once_with(
                    sample_capture_request.url, 
                    wait_until='networkidle'
                )

@pytest.mark.asyncio
async def test_capture_webpage_timeout(capture_engine, sample_capture_request):
    """Test capture timeout handling"""
    with patch('app.capture_engine.engine.async_playwright') as mock_playwright:
        # Mock timeout
        mock_playwright.side_effect = asyncio.TimeoutError("Page load timeout")
        
        with pytest.raises(CaptureError) as exc_info:
            await capture_engine.capture_webpage(sample_capture_request)
        
        assert "timeout" in str(exc_info.value).lower()
```

## Infrastructure Patterns

### 11. Terraform Module Pattern

```hcl
# infra/modules/s3_compliance/main.tf
resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project_prefix}-artifacts-${var.environment}"
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Purpose     = "compliance-artifacts"
  }
}

resource "aws_s3_bucket_object_lock_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  rule {
    default_retention {
      mode = "COMPLIANCE"
      years = var.retention_years
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_id
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

This comprehensive architecture documentation provides patterns for:
- Domain-driven design structure
- FastAPI application setup
- Authentication and authorization
- Data storage and retrieval
- Error handling and logging
- Configuration management
- Lambda function handlers
- Testing strategies
- Infrastructure as code

These patterns ensure maintainable, scalable, and secure code following best practices for compliance applications.