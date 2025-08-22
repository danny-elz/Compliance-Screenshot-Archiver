#!/usr/bin/env python3
"""
Test script for JWT authentication with Cognito.

This script can be used to test JWT token validation against a real Cognito setup.
Usage:
    python scripts/test_auth.py --token "your-jwt-token"
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.auth.deps import AuthenticationError, verify_jwt_token
from app.core.config import settings


async def test_token(token: str) -> None:
    """Test JWT token validation."""
    try:
        print("Testing JWT token validation...")
        print(f"JWKS URL: {settings.jwt_jwks_url}")
        print(f"JWT Audience: {settings.jwt_audience}")
        print(f"JWT Issuer: {settings.jwt_issuer}")
        print()

        user_info = await verify_jwt_token(token)

        print("✅ Token validation successful!")
        print(f"User ID: {user_info.get('sub')}")
        print(f"Email: {user_info.get('email')}")
        print(f"Role: {user_info.get('role')}")
        print(f"Cognito Groups: {user_info.get('cognito_groups')}")

    except AuthenticationError as e:
        print(f"❌ Authentication failed: {e.detail}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Test JWT authentication")
    parser.add_argument("--token", required=True, help="JWT token to test")

    args = parser.parse_args()

    # Check configuration
    if not settings.jwt_jwks_url:
        print("❌ JWT_JWKS_URL not configured. Please set Cognito environment variables.")
        print("Required variables:")
        print("  - COGNITO_USER_POOL_ID")
        print("  - COGNITO_CLIENT_ID")
        print("  - COGNITO_REGION (optional, defaults to us-east-1)")
        sys.exit(1)

    asyncio.run(test_token(args.token))


if __name__ == "__main__":
    main()
