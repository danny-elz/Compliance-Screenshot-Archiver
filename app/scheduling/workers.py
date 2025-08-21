from __future__ import annotations

from typing import Any

# SQS consumer: receives messages, calls capture_engine, persists results, handles retries.


def handle_message(body: dict[str, Any]) -> dict[str, Any]:
    """
    Process a single job message (stub).

    Args:
        body (dict): Job payload.

    Returns:
        dict: Processing result.
    """
    return {"ok": True, "job": body}
