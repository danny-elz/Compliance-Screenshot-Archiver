"""Tests for S3 storage operations."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from app.storage.s3 import (
    get_artifact,
    get_artifact_metadata,
    presign_download,
    s3_client,
    upload_artifact,
    verify_object_lock,
)


class TestS3Client:
    """Test S3 client creation."""

    def test_s3_client_creation(self) -> None:
        """Test that S3 client is created with correct configuration."""
        with patch("app.storage.s3.boto3.client") as mock_boto3:
            mock_client = MagicMock()
            mock_boto3.return_value = mock_client

            client = s3_client()

            assert client == mock_client
            mock_boto3.assert_called_once()


class TestUploadArtifact:
    """Test artifact upload functionality."""

    def test_upload_artifact_success(self, mock_s3_bucket: str) -> None:
        """Test successful artifact upload with Object Lock."""
        key = "test/artifact.pdf"
        data = b"test artifact content"
        metadata = {"test": "value"}

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client

            # Mock successful upload response
            mock_client.put_object.return_value = {
                "VersionId": "test-version-id",
                "ETag": '"test-etag"',
            }

            result = upload_artifact(key, data, metadata)

            # Verify result structure
            assert result["bucket"] == "test-artifacts-bucket"
            assert result["key"] == key
            assert result["version_id"] == "test-version-id"
            assert result["etag"] == '"test-etag"'
            assert result["object_lock_mode"] == "COMPLIANCE"
            assert "retention_until" in result

            # Verify put_object was called with correct parameters
            mock_client.put_object.assert_called_once()
            call_kwargs = mock_client.put_object.call_args[1]

            assert call_kwargs["Bucket"] == "test-artifacts-bucket"
            assert call_kwargs["Key"] == key
            assert call_kwargs["Body"] == data
            assert call_kwargs["ServerSideEncryption"] == "aws:kms"
            assert call_kwargs["ObjectLockMode"] == "COMPLIANCE"
            assert "ObjectLockRetainUntilDate" in call_kwargs

    def test_upload_artifact_with_custom_retention(self, mock_s3_bucket: str) -> None:
        """Test artifact upload with custom retention period."""
        key = "test/artifact.pdf"
        data = b"test content"
        retention_days = 365  # 1 year

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client
            mock_client.put_object.return_value = {"VersionId": "test-version"}

            before_upload = datetime.now(UTC)
            result = upload_artifact(key, data, retention_days=retention_days)
            after_upload = datetime.now(UTC)

            # Parse retention date and verify it's approximately correct
            retention_date = datetime.fromisoformat(result["retention_until"])
            expected_retention = before_upload + timedelta(days=retention_days)

            # Allow 1 minute tolerance for test execution time
            assert abs((retention_date - expected_retention).total_seconds()) < 60

    def test_upload_artifact_failure(self, mock_s3_bucket: str) -> None:
        """Test artifact upload failure handling."""
        key = "test/artifact.pdf"
        data = b"test content"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client

            # Mock S3 client error
            mock_client.put_object.side_effect = ClientError(
                {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}}, "PutObject"
            )

            with pytest.raises(ClientError):
                upload_artifact(key, data)

    def test_upload_artifact_empty_data(self, mock_s3_bucket: str) -> None:
        """Test artifact upload with empty data."""
        key = "test/empty.pdf"
        data = b""

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client
            mock_client.put_object.return_value = {"VersionId": "empty-version"}

            result = upload_artifact(key, data)

            assert result["key"] == key
            assert result["version_id"] == "empty-version"

            # Verify put_object was called with empty data
            call_kwargs = mock_client.put_object.call_args[1]
            assert call_kwargs["Body"] == b""

    def test_upload_artifact_no_metadata(self, mock_s3_bucket: str) -> None:
        """Test artifact upload with no metadata."""
        key = "test/no-metadata.pdf"
        data = b"test content"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client
            mock_client.put_object.return_value = {"VersionId": "no-meta-version"}

            result = upload_artifact(key, data, metadata=None)

            assert result["key"] == key

            # Verify metadata still includes compliance fields
            call_kwargs = mock_client.put_object.call_args[1]
            metadata = call_kwargs["Metadata"]
            assert "captured-at" in metadata
            assert "retention-until" in metadata


class TestGetArtifact:
    """Test artifact retrieval functionality."""

    def test_get_artifact_success(self, mock_s3_bucket: str) -> None:
        """Test successful artifact retrieval."""
        key = "test/artifact.pdf"
        expected_data = b"test artifact content"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client

            # Mock successful get_object response
            mock_response = MagicMock()
            mock_response.read.return_value = expected_data
            mock_client.get_object.return_value = {"Body": mock_response}

            result = get_artifact(key)

            assert result == expected_data
            mock_client.get_object.assert_called_once_with(
                Bucket="test-artifacts-bucket",
                Key=key,
            )

    def test_get_artifact_with_version(self, mock_s3_bucket: str) -> None:
        """Test artifact retrieval with specific version."""
        key = "test/artifact.pdf"
        version_id = "test-version-123"
        expected_data = b"test content"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client

            mock_response = MagicMock()
            mock_response.read.return_value = expected_data
            mock_client.get_object.return_value = {"Body": mock_response}

            result = get_artifact(key, version_id)

            assert result == expected_data
            mock_client.get_object.assert_called_once_with(
                Bucket="test-artifacts-bucket",
                Key=key,
                VersionId=version_id,
            )

    def test_get_artifact_failure(self, mock_s3_bucket: str) -> None:
        """Test artifact retrieval failure handling."""
        key = "nonexistent/artifact.pdf"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client

            mock_client.get_object.side_effect = ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "Key not found"}}, "GetObject"
            )

            with pytest.raises(ClientError):
                get_artifact(key)


class TestGetArtifactMetadata:
    """Test artifact metadata retrieval."""

    def test_get_artifact_metadata_success(self, mock_s3_bucket: str) -> None:
        """Test successful metadata retrieval."""
        key = "test/artifact.pdf"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client

            # Mock head_object response
            mock_client.head_object.return_value = {
                "ContentLength": 1024,
                "ETag": '"test-etag"',
                "LastModified": datetime.now(UTC),
                "VersionId": "test-version",
                "ObjectLockMode": "COMPLIANCE",
                "ObjectLockRetainUntilDate": datetime.now(UTC) + timedelta(days=365),
                "Metadata": {"custom": "value"},
            }

            result = get_artifact_metadata(key)

            assert result["key"] == key
            assert result["size"] == 1024
            assert result["etag"] == '"test-etag"'
            assert result["object_lock_mode"] == "COMPLIANCE"
            assert "last_modified" in result
            assert "version_id" in result
            assert "object_lock_retain_until" in result
            assert result["metadata"] == {"custom": "value"}

    def test_get_artifact_metadata_with_version(self, mock_s3_bucket: str) -> None:
        """Test metadata retrieval with specific version."""
        key = "test/artifact.pdf"
        version_id = "test-version-123"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client
            mock_client.head_object.return_value = {"ContentLength": 512}

            get_artifact_metadata(key, version_id)

            mock_client.head_object.assert_called_once_with(
                Bucket="test-artifacts-bucket",
                Key=key,
                VersionId=version_id,
            )

    def test_get_artifact_metadata_minimal_response(self, mock_s3_bucket: str) -> None:
        """Test metadata retrieval with minimal S3 response."""
        key = "test/minimal.pdf"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client

            # Mock minimal response with only required fields
            mock_client.head_object.return_value = {
                "ContentLength": 256,
            }

            result = get_artifact_metadata(key)

            assert result["key"] == key
            assert result["size"] == 256
            assert result["etag"] is None
            assert result["last_modified"] is None
            assert result["version_id"] is None
            assert result["object_lock_mode"] is None
            assert result["object_lock_retain_until"] is None
            assert result["metadata"] == {}


class TestPresignDownload:
    """Test presigned URL generation."""

    def test_presign_download_default_ttl(self, mock_s3_bucket: str) -> None:
        """Test presigned URL generation with default TTL."""
        key = "test/artifact.pdf"
        expected_url = "https://s3.amazonaws.com/test-bucket/test-key"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client
            mock_client.generate_presigned_url.return_value = expected_url

            result = presign_download(key)

            assert result == expected_url
            mock_client.generate_presigned_url.assert_called_once_with(
                "get_object",
                Params={"Bucket": "test-artifacts-bucket", "Key": key},
                ExpiresIn=300,  # Default from settings
            )

    def test_presign_download_custom_ttl(self, mock_s3_bucket: str) -> None:
        """Test presigned URL generation with custom TTL."""
        key = "test/artifact.pdf"
        expires = 600  # 10 minutes
        expected_url = "https://s3.amazonaws.com/test-bucket/test-key"

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client
            mock_client.generate_presigned_url.return_value = expected_url

            result = presign_download(key, expires)

            assert result == expected_url
            mock_client.generate_presigned_url.assert_called_once_with(
                "get_object",
                Params={"Bucket": "test-artifacts-bucket", "Key": key},
                ExpiresIn=expires,
            )

    def test_presign_download_ttl_cap(self, mock_s3_bucket: str) -> None:
        """Test that TTL is capped at 15 minutes (900 seconds)."""
        key = "test/artifact.pdf"
        expires = 1800  # 30 minutes (should be capped to 900)

        with patch("app.storage.s3.s3_client") as mock_s3_client:
            mock_client = MagicMock()
            mock_s3_client.return_value = mock_client
            mock_client.generate_presigned_url.return_value = "test-url"

            presign_download(key, expires)

            # Verify TTL was capped at 900 seconds
            call_kwargs = mock_client.generate_presigned_url.call_args[1]
            assert call_kwargs["ExpiresIn"] == 900


class TestVerifyObjectLock:
    """Test Object Lock verification."""

    def test_verify_object_lock_true(self, mock_s3_bucket: str) -> None:
        """Test verification when Object Lock is properly set."""
        key = "test/artifact.pdf"

        with patch("app.storage.s3.get_artifact_metadata") as mock_metadata:
            mock_metadata.return_value = {"object_lock_mode": "COMPLIANCE"}

            result = verify_object_lock(key)

            assert result is True
            mock_metadata.assert_called_once_with(key)

    def test_verify_object_lock_false(self, mock_s3_bucket: str) -> None:
        """Test verification when Object Lock is not set."""
        key = "test/artifact.pdf"

        with patch("app.storage.s3.get_artifact_metadata") as mock_metadata:
            mock_metadata.return_value = {"object_lock_mode": None}

            result = verify_object_lock(key)

            assert result is False

    def test_verify_object_lock_error(self, mock_s3_bucket: str) -> None:
        """Test verification when metadata retrieval fails."""
        key = "test/artifact.pdf"

        with patch("app.storage.s3.get_artifact_metadata") as mock_metadata:
            mock_metadata.side_effect = ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "Key not found"}}, "HeadObject"
            )

            result = verify_object_lock(key)

            assert result is False
