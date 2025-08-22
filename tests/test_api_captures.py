"""Tests for capture API endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.auth.deps import require_operator, require_viewer
from app.main import app


@pytest.fixture
def mock_auth_user() -> dict[str, str]:
    """Mock authenticated user."""
    return {
        "sub": "test-user-123",
        "email": "test@example.com",
        "role": "operator",
    }


@pytest.fixture
def client(mock_auth_user: dict[str, str]) -> TestClient:
    """Create test client with overridden dependencies."""

    def override_require_viewer():
        return mock_auth_user

    def override_require_operator():
        return mock_auth_user

    app.dependency_overrides[require_viewer] = override_require_viewer
    app.dependency_overrides[require_operator] = override_require_operator

    yield TestClient(app)

    # Clean up dependency overrides
    app.dependency_overrides.clear()


class TestListCaptures:
    """Test the list captures endpoint."""

    @patch("app.api.routes.captures.list_captures_by_user")
    def test_list_captures_success(self, mock_list: MagicMock, client: TestClient) -> None:
        """Test successful capture listing."""
        # Mock DynamoDB response
        mock_list.return_value = {
            "items": [
                {
                    "capture_id": "capture-1",
                    "sha256": "hash1",
                    "s3_key": "key1",
                    "artifact_type": "pdf",
                    "url": "https://example1.com",
                    "created_at": 1234567890.0,
                    "status": "completed",
                },
                {
                    "capture_id": "capture-2",
                    "sha256": "hash2",
                    "s3_key": "key2",
                    "artifact_type": "png",
                    "url": "https://example2.com",
                    "created_at": 1234567891.0,
                    "status": "completed",
                },
            ],
            "count": 2,
            "last_evaluated_key": None,
        }

        response = client.get("/api/captures")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "capture-1"
        assert data[1]["id"] == "capture-2"

    @patch("app.api.routes.captures.list_captures_by_user")
    def test_list_captures_with_pagination(self, mock_list: MagicMock, client: TestClient) -> None:
        """Test capture listing with pagination parameters."""
        mock_list.return_value = {"items": [], "count": 0, "last_evaluated_key": None}

        response = client.get('/api/captures?limit=10&last_key={"capture_id":"test-capture"}')

        assert response.status_code == 200
        mock_list.assert_called_once_with(
            user_id="test-user-123",
            limit=10,
            last_evaluated_key={"capture_id": "test-capture"},  # Proper JSON object
        )

    def test_list_captures_invalid_pagination_token(self, client: TestClient) -> None:
        """Test capture listing with invalid pagination token."""
        response = client.get("/api/captures?last_key=invalid-json")

        assert response.status_code == 400
        assert "Invalid pagination token" in response.json()["detail"]


class TestGetCapture:
    """Test the get single capture endpoint."""

    @patch("app.api.routes.captures.get_capture")
    def test_get_capture_success(self, mock_get: MagicMock, client: TestClient) -> None:
        """Test successful capture retrieval."""
        capture_id = "test-capture-123"
        mock_get.return_value = {
            "capture_id": capture_id,
            "user_id": "test-user-123",
            "sha256": "test-hash",
            "s3_key": "test-key",
            "artifact_type": "pdf",
            "url": "https://example.com",
            "created_at": 1234567890.0,
            "status": "completed",
        }

        response = client.get(f"/api/captures/{capture_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == capture_id
        assert data["url"] == "https://example.com"

    @patch("app.api.routes.captures.get_capture")
    def test_get_capture_not_found(self, mock_get: MagicMock, client: TestClient) -> None:
        """Test capture retrieval when capture doesn't exist."""
        mock_get.return_value = None

        response = client.get("/api/captures/nonexistent")

        assert response.status_code == 404
        assert "Capture not found" in response.json()["detail"]

    @patch("app.api.routes.captures.get_capture")
    def test_get_capture_access_denied(self, mock_get: MagicMock, client: TestClient) -> None:
        """Test capture retrieval with access denied."""
        mock_get.return_value = {
            "capture_id": "test-capture",
            "user_id": "other-user",  # Different user
            "sha256": "test-hash",
            "s3_key": "test-key",
            "artifact_type": "pdf",
            "url": "https://example.com",
            "created_at": 1234567890.0,
        }

        response = client.get("/api/captures/test-capture")

        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    @patch("app.api.routes.captures.get_capture")
    def test_get_capture_missing_status(self, mock_get: MagicMock, client: TestClient) -> None:
        """Test capture retrieval when status field is missing (should default)."""
        capture_id = "test-capture-no-status"
        mock_get.return_value = {
            "capture_id": capture_id,
            "user_id": "test-user-123",
            "sha256": "test-hash",
            "s3_key": "test-key",
            "artifact_type": "pdf",
            "url": "https://example.com",
            "created_at": 1234567890.0,
            # Missing status field
        }

        response = client.get(f"/api/captures/{capture_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"  # Should default to "completed"


class TestDownloadCapture:
    """Test the download capture endpoint."""

    @patch("app.api.routes.captures.presign_download")
    @patch("app.api.routes.captures.get_capture")
    def test_download_capture_success(
        self, mock_get: MagicMock, mock_presign: MagicMock, client: TestClient
    ) -> None:
        """Test successful download URL generation."""
        capture_id = "test-capture-123"
        mock_get.return_value = {
            "capture_id": capture_id,
            "user_id": "test-user-123",
            "s3_key": "captures/test.pdf",
            "artifact_type": "pdf",
        }
        mock_presign.return_value = "https://s3.amazonaws.com/bucket/key?signed-url"

        response = client.get(f"/api/captures/{capture_id}/download")

        assert response.status_code == 200
        data = response.json()
        assert "download_url" in data
        assert data["expires_in"] == "900"
        assert data["content_type"] == "application/pdf"
        assert data["filename"] == f"{capture_id}.pdf"

    @patch("app.api.routes.captures.get_capture")
    def test_download_capture_not_found(self, mock_get: MagicMock, client: TestClient) -> None:
        """Test download when capture doesn't exist."""
        mock_get.return_value = None

        response = client.get("/api/captures/nonexistent/download")

        assert response.status_code == 404

    @patch("app.api.routes.captures.get_capture")
    def test_download_capture_access_denied(self, mock_get: MagicMock, client: TestClient) -> None:
        """Test download with access denied."""
        mock_get.return_value = {
            "capture_id": "test-capture",
            "user_id": "other-user",  # Different user
            "s3_key": "test-key",
            "artifact_type": "pdf",
        }

        response = client.get("/api/captures/test-capture/download")

        assert response.status_code == 403

    @patch("app.api.routes.captures.presign_download")
    @patch("app.api.routes.captures.get_capture")
    def test_download_capture_png_content_type(
        self, mock_get: MagicMock, mock_presign: MagicMock, client: TestClient
    ) -> None:
        """Test download URL generation for PNG files has correct content type."""
        capture_id = "test-png-capture"
        mock_get.return_value = {
            "capture_id": capture_id,
            "user_id": "test-user-123",
            "s3_key": "captures/test.png",
            "artifact_type": "png",
        }
        mock_presign.return_value = "https://s3.amazonaws.com/bucket/key?signed-url"

        response = client.get(f"/api/captures/{capture_id}/download")

        assert response.status_code == 200
        data = response.json()
        assert data["content_type"] == "image/png"
        assert data["filename"] == f"{capture_id}.png"


class TestTriggerCapture:
    """Test the trigger capture endpoint."""

    @patch("app.api.routes.captures.process_capture_request")
    def test_trigger_capture_success(self, mock_process: AsyncMock, client: TestClient) -> None:
        """Test successful capture trigger."""
        mock_process.return_value = {
            "capture_id": "new-capture-123",
            "status": "completed",
            "url": "https://example.com",
            "sha256": "test-hash",
            "s3_key": "captures/new-capture-123.pdf",
            "artifact_type": "pdf",
        }

        response = client.post(
            "/api/captures/trigger", params={"url": "https://example.com", "artifact_type": "pdf"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["capture_id"] == "new-capture-123"
        assert data["status"] == "completed"
        assert data["url"] == "https://example.com"

    @patch("app.api.routes.captures.process_capture_request")
    def test_trigger_capture_png(self, mock_process: AsyncMock, client: TestClient) -> None:
        """Test triggering PNG capture."""
        mock_process.return_value = {
            "capture_id": "png-capture-123",
            "status": "completed",
            "url": "https://example.com",
            "sha256": "test-hash",
            "s3_key": "captures/png-capture-123.png",
            "artifact_type": "png",
        }

        response = client.post(
            "/api/captures/trigger", params={"url": "https://example.com", "artifact_type": "png"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["artifact_type"] == "png"

    @patch("app.api.routes.captures.process_capture_request")
    def test_trigger_capture_failure(self, mock_process: AsyncMock, client: TestClient) -> None:
        """Test capture trigger failure."""
        mock_process.side_effect = Exception("Capture failed")

        response = client.post(
            "/api/captures/trigger", params={"url": "https://example.com", "artifact_type": "pdf"}
        )

        assert response.status_code == 500
        assert "Capture failed" in response.json()["detail"]

    def test_trigger_capture_invalid_type(self, client: TestClient) -> None:
        """Test capture trigger with invalid artifact type."""

        response = client.post(
            "/api/captures/trigger",
            params={"url": "https://example.com", "artifact_type": "invalid"},
        )

        assert response.status_code == 422  # Validation error


class TestVerifyCapture:
    """Test the verify capture endpoint."""

    @patch("app.storage.s3.verify_object_lock")
    @patch("app.storage.dynamo.get_capture_by_hash")
    def test_verify_capture_success(
        self, mock_get_hash: MagicMock, mock_verify: MagicMock, client: TestClient
    ) -> None:
        """Test successful capture verification."""
        sha256 = "test-hash-123"
        mock_get_hash.return_value = {
            "capture_id": "verified-capture",
            "url": "https://example.com",
            "artifact_type": "pdf",
            "created_at": 1234567890.0,
            "s3_key": "test-key",
        }
        mock_verify.return_value = True

        response = client.post("/api/captures/verify", params={"sha256": sha256})

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True
        assert data["capture_id"] == "verified-capture"
        assert data["object_lock_verified"] is True
        assert data["sha256"] == sha256

    @patch("app.storage.dynamo.get_capture_by_hash")
    def test_verify_capture_not_found(self, mock_get_hash: MagicMock, client: TestClient) -> None:
        """Test verification when capture not found by hash."""
        sha256 = "nonexistent-hash"
        mock_get_hash.return_value = None

        response = client.post("/api/captures/verify", params={"sha256": sha256})

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is False
        assert data["reason"] == "No capture found with this hash"
        assert data["sha256"] == sha256

    @patch("app.storage.s3.verify_object_lock")
    @patch("app.storage.dynamo.get_capture_by_hash")
    def test_verify_capture_object_lock_failed(
        self, mock_get_hash: MagicMock, mock_verify: MagicMock, client: TestClient
    ) -> None:
        """Test verification when Object Lock verification fails."""
        sha256 = "test-hash-456"
        mock_get_hash.return_value = {
            "capture_id": "unverified-capture",
            "url": "https://example.com",
            "artifact_type": "pdf",
            "created_at": 1234567890.0,
            "s3_key": "test-key",
        }
        mock_verify.return_value = False  # Object Lock verification failed

        response = client.post("/api/captures/verify", params={"sha256": sha256})

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True  # Capture exists
        assert data["object_lock_verified"] is False  # But Object Lock failed
