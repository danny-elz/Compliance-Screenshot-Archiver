"""Mock capture engine for MVP testing without Playwright dependencies."""

from __future__ import annotations

import hashlib
import logging
from typing import Any

logger = logging.getLogger(__name__)


async def capture_webpage_mock(
    url: str,
    artifact_type: str = "pdf",
    viewport_width: int = 1920,
    viewport_height: int = 1080,
) -> dict[str, Any]:
    """
    Mock capture function that generates dummy artifacts for testing.

    Args:
        url: Target URL to capture.
        artifact_type: 'png' or 'pdf'.
        viewport_width: Browser viewport width (ignored in mock).
        viewport_height: Browser viewport height (ignored in mock).

    Returns:
        dict: Mock capture result with dummy data and metadata.
    """
    if artifact_type not in ("pdf", "png"):
        raise ValueError(f"Invalid artifact_type: {artifact_type}")

    # Generate mock PDF or PNG data
    if artifact_type == "pdf":
        # Minimal PDF header for testing
        artifact_data = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        artifact_data += b"Mock PDF content for testing\n%%EOF"
    else:  # png
        # Minimal PNG header for testing
        artifact_data = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13"
            b"\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```"
            b"\x00\x00\x00\x04\x00\x01\x27\xb9\xb8\x1f\x00\x00\x00\x00IEND\xaeB`\x82"
        )

    # Calculate SHA-256 hash
    sha256_hash = hashlib.sha256(artifact_data).hexdigest()

    logger.info(f"Mock captured {url} as {artifact_type}, SHA-256: {sha256_hash}")

    return {
        "data": artifact_data,
        "sha256": sha256_hash,
        "artifact_type": artifact_type,
        "url": url,
        "content_length": len(artifact_data),
        "mock": True,  # Indicate this is mock data
    }
