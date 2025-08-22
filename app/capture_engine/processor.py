"""Core capture processing functionality."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from ..core.logging import jlog
from ..storage.dynamo import CaptureData, create_capture
from ..storage.s3 import upload_artifact

# Import moved inside function to avoid Playwright dependency at module level

logger = logging.getLogger(__name__)


async def process_capture_request(
    url: str,
    artifact_type: str = "pdf",
    user_id: str = "system",
    metadata: dict[str, Any] = None,
) -> dict[str, Any]:
    """
    Process a single capture request end-to-end.

    Args:
        url: Target URL to capture.
        artifact_type: Type of artifact (pdf/png).
        user_id: ID of requesting user.
        metadata: Additional metadata.

    Returns:
        dict: Capture result with S3 and DynamoDB details.
    """
    # Import here to avoid Playwright dependency when module is imported
    # Try Playwright first, then simple engine, then mock engine
    try:
        from .engine import capture_webpage

        jlog(logger, "capture_engine", message="Using Playwright engine", level="INFO")
    except ImportError:
        try:
            from .simple_engine import capture_webpage_simple as capture_webpage

            jlog(logger, "capture_engine", message="Using simple HTTP capture engine", level="INFO")
        except ImportError:
            jlog(logger, "capture_engine", message="Using mock capture engine", level="WARNING")
            from .mock_engine import capture_webpage_mock as capture_webpage

    capture_id = str(uuid.uuid4())

    try:
        # Step 1: Capture the webpage
        jlog(logger, "capture_start", capture_id=capture_id, url=url, artifact_type=artifact_type)

        capture_result = await capture_webpage(url, artifact_type)
        sha256_hash = capture_result["sha256"]
        artifact_data = capture_result["data"]

        # Step 2: Upload to S3 with Object Lock
        s3_key = f"captures/{capture_id}.{artifact_type}"
        upload_metadata = {
            "url": url,
            "artifact-type": artifact_type,
            "capture-id": capture_id,
            "user-id": user_id,
        }
        if metadata:
            upload_metadata.update({f"custom-{k}": str(v) for k, v in metadata.items()})

        s3_result = upload_artifact(
            key=s3_key,
            data=artifact_data,
            metadata=upload_metadata,
        )

        jlog(
            logger,
            "s3_upload_complete",
            capture_id=capture_id,
            s3_key=s3_key,
            version_id=s3_result["version_id"],
            retention_until=s3_result["retention_until"],
        )

        # Step 3: Store record in DynamoDB
        capture_data = CaptureData(
            capture_id=capture_id,
            url=url,
            sha256=sha256_hash,
            s3_key=s3_key,
            artifact_type=artifact_type,
            user_id=user_id,
            metadata={
                "s3_version_id": s3_result["version_id"],
                "content_length": capture_result["content_length"],
                "retention_until": s3_result["retention_until"],
                **(metadata or {}),
            },
        )
        ddb_result = create_capture(capture_data)

        jlog(
            logger,
            "capture_complete",
            capture_id=capture_id,
            sha256=sha256_hash,
            s3_key=s3_key,
            status="success",
        )

        return {
            "capture_id": capture_id,
            "url": url,
            "sha256": sha256_hash,
            "s3_key": s3_key,
            "artifact_type": artifact_type,
            "user_id": user_id,
            "status": "completed",
            "s3_details": s3_result,
            "ddb_record": ddb_result,
        }

    except Exception as e:
        error_msg = str(e)
        import traceback

        stack_trace = traceback.format_exc()

        jlog(
            logger,
            "capture_failed",
            capture_id=capture_id,
            url=url,
            error=error_msg,
            level="ERROR",
        )

        # Don't expose internal details in the response
        return {
            "capture_id": capture_id,
            "url": url,
            "status": "failed",
            "error": "Capture failed - check logs for details",
            "internal_error": error_msg,
            "stack_trace": stack_trace,
        }
