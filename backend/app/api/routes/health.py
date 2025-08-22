"""Health check and authentication status endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends

from ...auth.deps import get_current_user
from ...core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Pre-instantiated dependency to avoid B008 issues
_auth_dep = Depends(get_current_user)


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """
    Basic health check endpoint.

    Returns:
        dict: Health status and configuration info.
    """
    return {
        "status": "healthy",
        "service": "compliance-screenshot-archiver",
        "version": "0.1.0",
        "environment": settings.env,
        "auth": {
            "cognito_configured": bool(
                settings.cognito_user_pool_id and settings.cognito_client_id
            ),
            "jwks_url_configured": bool(settings.jwt_jwks_url),
            "region": settings.cognito_region,
        },
    }


@router.get("/auth/status")
async def auth_status(user_info: dict[str, Any] = _auth_dep) -> dict[str, Any]:
    """
    Check authentication status for the current user.

    Args:
        user_info: User information from JWT token.

    Returns:
        dict: User authentication status and information.
    """
    return {
        "authenticated": True,
        "user_id": user_info.get("sub"),
        "email": user_info.get("email"),
        "role": user_info.get("role"),
        "cognito_groups": user_info.get("cognito_groups", []),
        "permissions": {
            "can_view": True,
            "can_trigger_captures": user_info.get("role") in ["operator", "admin"],
            "can_admin": user_info.get("role") == "admin",
        },
    }


@router.get("/auth/config")
async def auth_config() -> dict[str, Any]:
    """
    Get authentication configuration (public info only).

    Returns:
        dict: Public authentication configuration.
    """
    return {
        "cognito": {
            "region": settings.cognito_region,
            "user_pool_id": settings.cognito_user_pool_id,
            "client_id": settings.cognito_client_id,
        },
        "jwt": {
            "audience": settings.jwt_audience,
            "issuer": settings.jwt_issuer,
        },
        "roles": {
            "available": ["viewer", "operator", "admin"],
            "hierarchy": {
                "viewer": "Can view captures and schedules",
                "operator": "Can view and trigger captures",
                "admin": "Full access to all resources",
            },
        },
    }
