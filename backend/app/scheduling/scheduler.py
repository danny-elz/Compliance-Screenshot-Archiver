from __future__ import annotations

from typing import Any

# EventBridge tick handler (list due schedules, enqueue SQS)
# Wire this into lambda_handler.eventbridge_handler when ready.


def tick() -> dict[str, Any]:
    """
    Scan for due schedules and enqueue jobs (stub).

    Returns:
        dict: Summary of enqueued jobs.
    """
    return {"enqueued": 0}
