from __future__ import annotations

import json
import logging
from typing import Any

from mangum import Mangum  # type: ignore

from .main import app

logger = logging.getLogger(__name__)
handler = Mangum(app)


def eventbridge_handler(event: dict[str, Any], _context: Any) -> dict:
    """
    Entry point for EventBridge/SQS-triggered Lambdas (scheduling/worker).

    Args:
        event (Dict[str, Any]): AWS event payload (EventBridge or SQS batch).
        _context (Any): Lambda context.

    Returns:
        dict: Result summary.
    """
    # Reason: keep as a stub; wire /scheduling/*.py logic here.
    logger.info(json.dumps({"message": "event received", "event": event}))
    return {"ok": True, "received": True}
