from __future__ import annotations

from typing import Any

# Placeholder for Playwright-based engine inside a Lambda container image.
# Keep this module focused on:
#  - Browser lifecycle (launch/close)
#  - Navigation/wait strategy (networkidle, timeouts)
#  - PDF/PNG rendering
#  - Hashing stream (SHA-256) and S3 upload
#  - Returning metadata (s3_key, sha256)


def capture_stub(url: str, artifact_type: str = "pdf") -> dict[str, Any]:
    """
    Stub capture method for early integration tests.

    Args:
        url (str): Target URL.
        artifact_type (str): 'png' or 'pdf'.

    Returns:
        dict: Minimal result payload with keys you'd persist.
    """
    return {
        "sha256": "stubbed_sha256",
        "s3_key": f"captures/stub.{artifact_type}",
        "artifact_type": artifact_type,
    }
