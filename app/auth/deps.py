from __future__ import annotations

from typing import Literal


# Reason: Stub RBAC dependency; replace with Cognito/JWT verification.
def require_role(role: Literal["admin", "operator", "viewer"]):
    """
    Dependency that enforces a minimum role.

    Args:
        role (Literal): The required role.

    Returns:
        callable: Dependency function for FastAPI.
    """

    def _dep() -> dict[str, str]:
        # TODO: parse JWT from Authorization header, check claims.
        # For now, this always allows.
        return {"role": role}

    return _dep


# Pre-built dependencies for common roles to avoid B008 issues
require_viewer = require_role("viewer")
require_operator = require_role("operator")
require_admin = require_role("admin")
