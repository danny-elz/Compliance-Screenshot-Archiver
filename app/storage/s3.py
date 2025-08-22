from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Constants
MAX_PRESIGN_TTL_SECONDS = 900  # 15 minutes max for security
DEFAULT_RETENTION_DAYS = 2555  # ~7 years default


def s3_client() -> Any:
    """
    Create an S3 client with recommended defaults.

    Returns:
        botocore.client.S3: S3 client.
    """
    return boto3.client("s3", config=Config(s3={"addressing_style": "virtual"}))


def upload_artifact(
    key: str,
    data: bytes,
    metadata: dict[str, str] = None,
    retention_days: int = DEFAULT_RETENTION_DAYS,
) -> dict[str, Any]:
    """
    Upload an artifact to S3 with Object Lock in Compliance mode.

    Args:
        key: S3 object key.
        data: Binary data to upload.
        metadata: Optional metadata to attach.
        retention_days: Retention period in days.

    Returns:
        dict: Upload result with version ID and Object Lock details.
    """
    client = s3_client()

    # Calculate retention date
    retention_until = datetime.now(timezone.utc) + timedelta(days=retention_days)

    # Prepare metadata
    if metadata is None:
        metadata = {}

    # Add compliance metadata
    metadata.update(
        {
            "captured-at": datetime.now(timezone.utc).isoformat(),
            "retention-until": retention_until.isoformat(),
        }
    )

    try:
        # Upload with Object Lock
        response = client.put_object(
            Bucket=settings.s3_bucket_artifacts,
            Key=key,
            Body=data,
            ServerSideEncryption="aws:kms",
            SSEKMSKeyId=settings.kms_key_arn,
            ObjectLockMode="COMPLIANCE",
            ObjectLockRetainUntilDate=retention_until,
            Metadata=metadata,
        )

        logger.info(
            f"Uploaded artifact to s3://{settings.s3_bucket_artifacts}/{key} "
            f"with Object Lock until {retention_until.isoformat()}"
        )

        return {
            "bucket": settings.s3_bucket_artifacts,
            "key": key,
            "version_id": response.get("VersionId"),
            "etag": response.get("ETag"),
            "retention_until": retention_until.isoformat(),
            "object_lock_mode": "COMPLIANCE",
        }

    except ClientError as e:
        logger.error(f"Failed to upload artifact: {e}")
        raise


def get_artifact(key: str, version_id: str = None) -> bytes:
    """
    Retrieve an artifact from S3.

    Args:
        key: S3 object key.
        version_id: Optional specific version to retrieve.

    Returns:
        bytes: The artifact data.
    """
    client = s3_client()

    params = {
        "Bucket": settings.s3_bucket_artifacts,
        "Key": key,
    }

    if version_id:
        params["VersionId"] = version_id

    try:
        response = client.get_object(**params)
        data: bytes = response["Body"].read()
        return data
    except ClientError as e:
        logger.error(f"Failed to retrieve artifact: {e}")
        raise


def get_artifact_metadata(key: str, version_id: str = None) -> dict[str, Any]:
    """
    Get metadata for an artifact without downloading it.

    Args:
        key: S3 object key.
        version_id: Optional specific version.

    Returns:
        dict: Object metadata including size, hash, and lock status.
    """
    client = s3_client()

    params = {
        "Bucket": settings.s3_bucket_artifacts,
        "Key": key,
    }

    if version_id:
        params["VersionId"] = version_id

    try:
        response = client.head_object(**params)

        return {
            "key": key,
            "size": response.get("ContentLength"),
            "etag": response.get("ETag"),
            "last_modified": response.get("LastModified"),
            "version_id": response.get("VersionId"),
            "object_lock_mode": response.get("ObjectLockMode"),
            "object_lock_retain_until": response.get("ObjectLockRetainUntilDate"),
            "metadata": response.get("Metadata", {}),
        }
    except ClientError as e:
        logger.error(f"Failed to get artifact metadata: {e}")
        raise


def presign_download(key: str, expires: int = None) -> str:
    """
    Generate a presigned URL for downloading an artifact.

    Args:
        key: Object key.
        expires: Expiry seconds (default from settings).

    Returns:
        str: Presigned URL.
    """
    client = s3_client()
    ttl = expires or settings.presign_ttl_seconds

    # Ensure TTL doesn't exceed 15 minutes per security requirements
    if ttl > MAX_PRESIGN_TTL_SECONDS:
        logger.warning(
            f"Requested TTL {ttl}s exceeds 15 minutes, capping at {MAX_PRESIGN_TTL_SECONDS}s"
        )
        ttl = MAX_PRESIGN_TTL_SECONDS

    url: str = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_artifacts, "Key": key},
        ExpiresIn=ttl,
    )
    return url


def verify_object_lock(key: str) -> bool:
    """
    Verify that an object has Object Lock in Compliance mode.

    Args:
        key: S3 object key.

    Returns:
        bool: True if properly locked, False otherwise.
    """
    try:
        metadata = get_artifact_metadata(key)
        return metadata.get("object_lock_mode") == "COMPLIANCE"
    except ClientError:
        return False
