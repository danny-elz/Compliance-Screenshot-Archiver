from __future__ import annotations

import os

from dotenv import load_dotenv
from pydantic import AnyHttpUrl, BaseModel, Field


class Settings(BaseModel):
    """
    Centralized settings loaded from env (dotenv in dev; Secrets/SSM in prod).
    """

    env: str = Field(default=os.getenv("APP_ENV", "dev"))
    aws_region: str = Field(default=os.getenv("AWS_REGION", "us-east-1"))

    # API
    api_base_path: str = Field(default=os.getenv("API_BASE_PATH", "/api"))
    jwt_audience: str | None = os.getenv("JWT_AUDIENCE")
    jwt_issuer: str | None = os.getenv("JWT_ISSUER")
    jwt_jwks_url: AnyHttpUrl | None = os.getenv("JWT_JWKS_URL")  # Cognito JWKS

    # Data
    s3_bucket_artifacts: str = Field(default=os.getenv("S3_BUCKET_ARTIFACTS", ""))
    kms_key_arn: str | None = os.getenv("KMS_KEY_ARN")
    ddb_table_schedules: str = Field(default=os.getenv("DDB_TABLE_SCHEDULES", "schedules"))
    ddb_table_captures: str = Field(default=os.getenv("DDB_TABLE_CAPTURES", "captures"))

    # Security
    presign_ttl_seconds: int = Field(default=int(os.getenv("PRESIGN_TTL_SECONDS", "300")))


def load_env() -> Settings:
    """
    Load environment variables (dotenv in dev) and return typed Settings.

    Returns:
        Settings: Parsed, validated settings.
    """
    # Reason: local dev convenience; prod should inject env via platform.
    if os.getenv("APP_ENV", "dev") == "dev":
        load_dotenv()
    return Settings()


settings = load_env()
