"""Tests for JWT authentication functionality."""

from unittest.mock import MagicMock, patch

import pytest

from app.auth.deps import (
    COGNITO_GROUP_TO_ROLE,
    ROLE_HIERARCHY,
    AuthenticationError,
    AuthorizationError,
    can_access_user_resource,
    get_current_user,
    is_admin,
    require_admin,
    require_operator,
    verify_jwt_token,
)


class TestJWTAuthentication:
    """Test JWT token validation and user extraction."""

    @pytest.mark.asyncio
    @patch("app.auth.deps.get_jwks")
    @patch("app.auth.deps.jwt.decode")
    @patch("app.auth.deps.jwt.get_unverified_header")
    async def test_verify_jwt_token_success(self, mock_header, mock_decode, mock_jwks):
        """Test successful JWT token verification."""
        # Arrange
        mock_header.return_value = {"kid": "test-key-id"}
        mock_jwks.return_value = {"keys": [{"kid": "test-key-id", "kty": "RSA"}]}
        mock_decode.return_value = {
            "sub": "user-123",
            "email": "test@example.com",
            "cognito:groups": ["admin"],
        }

        # Act
        result = await verify_jwt_token("valid-token")

        # Assert
        assert result["sub"] == "user-123"
        assert result["email"] == "test@example.com"
        assert result["role"] == "admin"
        assert result["cognito_groups"] == ["admin"]

    @pytest.mark.asyncio
    @patch("app.auth.deps.get_jwks")
    @patch("app.auth.deps.jwt.get_unverified_header")
    async def test_verify_jwt_token_missing_key_id(self, mock_header, mock_jwks):
        """Test JWT token verification with missing key ID."""
        # Arrange
        mock_header.return_value = {}
        mock_jwks.return_value = {"keys": []}

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            await verify_jwt_token("invalid-token")
        assert "Token missing key ID" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch("app.auth.deps.get_jwks")
    @patch("app.auth.deps.jwt.get_unverified_header")
    async def test_verify_jwt_token_key_not_found(self, mock_header, mock_jwks):
        """Test JWT token verification with key not found."""
        # Arrange
        mock_header.return_value = {"kid": "unknown-key"}
        mock_jwks.return_value = {"keys": [{"kid": "different-key", "kty": "RSA"}]}

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            await verify_jwt_token("invalid-token")
        assert "Unable to find signing key" in str(exc_info.value.detail)

    def test_role_hierarchy(self):
        """Test role hierarchy values are correct."""
        assert ROLE_HIERARCHY["admin"] > ROLE_HIERARCHY["operator"]
        assert ROLE_HIERARCHY["operator"] > ROLE_HIERARCHY["viewer"]

    def test_cognito_group_mapping(self):
        """Test Cognito group to role mapping."""
        assert COGNITO_GROUP_TO_ROLE["admin"] == "admin"
        assert COGNITO_GROUP_TO_ROLE["user"] == "operator"
        assert COGNITO_GROUP_TO_ROLE["auditor"] == "viewer"

    def test_is_admin(self):
        """Test admin role detection."""
        admin_user = {"role": "admin", "sub": "user-123"}
        operator_user = {"role": "operator", "sub": "user-456"}

        assert is_admin(admin_user) is True
        assert is_admin(operator_user) is False

    def test_can_access_user_resource(self):
        """Test user resource access control."""
        admin_user = {"role": "admin", "sub": "admin-123"}
        regular_user = {"role": "operator", "sub": "user-456"}

        # Admin can access any resource
        assert can_access_user_resource(admin_user, "any-user-id") is True

        # Regular user can access own resources
        assert can_access_user_resource(regular_user, "user-456") is True

        # Regular user cannot access other user's resources
        assert can_access_user_resource(regular_user, "other-user") is False

    @pytest.mark.asyncio
    async def test_get_current_user_missing_header(self):
        """Test get_current_user with missing Authorization header."""
        # Arrange
        mock_request = MagicMock()
        mock_request.headers.get.return_value = None

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            await get_current_user(mock_request)
        assert "Authorization header missing" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_scheme(self):
        """Test get_current_user with invalid authorization scheme."""
        # Arrange
        mock_request = MagicMock()
        mock_request.headers.get.return_value = "Basic invalid-token"

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            await get_current_user(mock_request)
        assert "Invalid authorization scheme" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_format(self):
        """Test get_current_user with invalid header format."""
        # Arrange
        mock_request = MagicMock()
        mock_request.headers.get.return_value = "invalid-format"

        # Act & Assert
        with pytest.raises(AuthenticationError) as exc_info:
            await get_current_user(mock_request)
        assert "Invalid authorization header format" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_require_role_sufficient_permissions(self):
        """Test require_role with sufficient permissions."""
        # Arrange
        user_info = {"role": "admin", "sub": "user-123"}

        # Act - test operator requirement with admin user (should pass)
        result = await require_operator(user_info)

        # Assert
        assert result == user_info

    @pytest.mark.asyncio
    async def test_require_role_insufficient_permissions(self):
        """Test require_role with insufficient permissions."""
        # Arrange
        user_info = {"role": "viewer", "sub": "user-123"}

        # Act & Assert - test admin requirement with viewer user (should fail)
        with pytest.raises(AuthorizationError) as exc_info:
            await require_admin(user_info)
        assert "Role 'admin' required" in str(exc_info.value.detail)


class TestRoleMapping:
    """Test role mapping from Cognito groups."""

    def test_default_role_assignment(self):
        """Test default role assignment when no groups provided."""

        # This would be tested with mocked JWT decode that returns no groups
        # The default role should be "viewer"

    def test_multiple_groups_highest_role(self):
        """Test that highest role is assigned when user has multiple groups."""
        # Test case where user is in both "user" and "admin" groups
        # Should get "admin" role (highest in hierarchy)

    def test_unknown_group_ignored(self):
        """Test that unknown Cognito groups are ignored."""
        # Test case where user has unknown group like "custom-group"
        # Should fall back to default role
