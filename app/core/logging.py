from __future__ import annotations

import json
import logging
from typing import Any


def configure_logging(level: int = logging.INFO) -> None:  # type: ignore[attr-defined]
    """
    Configure JSON logging for Lambda/API environments.

    Args:
        level (int): Logging level.
    """
    handler = logging.StreamHandler()  # type: ignore[attr-defined]
    formatter = logging.Formatter("%(message)s")  # type: ignore[attr-defined]
    handler.setFormatter(formatter)
    root = logging.getLogger()  # type: ignore[attr-defined]
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)


def jlog(logger: logging.Logger, msg: str, **fields: Any) -> None:  # type: ignore[name-defined]
    """
    Emit a JSON log with message and extra fields.

    Args:
        logger (logging.Logger): Logger.
        msg (str): Human-readable message.
        **fields: Additional structured fields.
    """
    payload = {"message": msg, **fields}
    logger.info(json.dumps(payload))
