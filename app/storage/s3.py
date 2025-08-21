from __future__ import annotations

from typing import TYPE_CHECKING, Any

import boto3
from botocore.client import Config

from app.core.config import settings

if TYPE_CHECKING:
    pass


def s3_client() -> Any:
    """
    Create an S3 client with recommended defaults.

    Returns:
        botocore.client.S3: S3 client.
    """
    return boto3.client("s3", config=Config(s3={"addressing_style": "virtual"}))


def presign_download(key: str, expires: int | None = None) -> str:
    """
    Generate a presigned URL for downloading an artifact.

    Args:
        key (str): Object key.
        expires (int|None): Expiry seconds (default from settings).

    Returns:
        str: Presigned URL.
    """
    client = s3_client()
    ttl = expires or settings.presign_ttl_seconds
    url: str = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_artifacts, "Key": key},
        ExpiresIn=ttl,
    )
    return url
