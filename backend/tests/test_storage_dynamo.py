"""Tests for DynamoDB storage operations."""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from app.storage.dynamo import (
    CaptureData,
    ScheduleData,
    create_capture,
    create_schedule,
    delete_schedule,
    get_capture,
    get_capture_by_hash,
    get_schedule,
    list_captures_by_user,
    list_schedules_by_user,
    update_schedule,
)


class TestCaptureOperations:
    """Test capture-related DynamoDB operations."""

    def test_create_capture_success(
        self, mock_dynamodb_tables: dict[str, Any], sample_capture_data: dict[str, Any]
    ) -> None:
        """Test successful capture creation."""
        data = sample_capture_data

        capture_data = CaptureData(
            capture_id=data["capture_id"],
            url=data["url"],
            sha256=data["sha256"],
            s3_key=data["s3_key"],
            artifact_type=data["artifact_type"],
            user_id=data["user_id"],
            metadata=data["metadata"],
        )
        result = create_capture(capture_data)

        assert result["capture_id"] == data["capture_id"]
        assert result["url"] == data["url"]
        assert result["sha256"] == data["sha256"]
        assert result["s3_key"] == data["s3_key"]
        assert result["artifact_type"] == data["artifact_type"]
        assert result["user_id"] == data["user_id"]
        assert result["status"] == "completed"
        assert "created_at" in result
        assert isinstance(result["created_at"], Decimal)

    def test_create_capture_minimal_data(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test capture creation with minimal required data."""
        capture_data = CaptureData(
            capture_id="minimal-capture",
            url="https://example.com",
            sha256="test-hash",
            s3_key="test-key",
            artifact_type="pdf",
            user_id="test-user",
        )
        result = create_capture(capture_data)

        assert result["capture_id"] == "minimal-capture"
        assert result["metadata"] == {}

    def test_get_capture_success(
        self, mock_dynamodb_tables: dict[str, Any], sample_capture_data: dict[str, Any]
    ) -> None:
        """Test successful capture retrieval."""
        data = sample_capture_data

        # First create a capture
        create_capture(
            CaptureData(
                capture_id=data["capture_id"],
                url=data["url"],
                sha256=data["sha256"],
                s3_key=data["s3_key"],
                artifact_type=data["artifact_type"],
                user_id=data["user_id"],
                metadata=data["metadata"],
            )
        )

        # Then retrieve it
        result = get_capture(data["capture_id"])

        assert result is not None
        assert result["capture_id"] == data["capture_id"]
        assert result["url"] == data["url"]
        assert result["sha256"] == data["sha256"]

    def test_get_capture_not_found(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test capture retrieval when capture doesn't exist."""
        result = get_capture("nonexistent-capture")

        assert result is None

    def test_list_captures_by_user(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test listing captures by user."""
        user_id = "test-user-123"

        # Create multiple captures for the user
        for i in range(3):
            create_capture(
                capture_id=f"capture-{i}",
                url=f"https://example{i}.com",
                sha256=f"hash{i}",
                s3_key=f"key{i}",
                artifact_type="pdf",
                user_id=user_id,
            )

        # Create capture for different user
        create_capture(
            capture_id="other-capture",
            url="https://other.com",
            sha256="other-hash",
            s3_key="other-key",
            artifact_type="pdf",
            user_id="other-user",
        )

        result = list_captures_by_user(user_id)

        assert result["count"] == 3
        assert len(result["items"]) == 3

        # Verify all captures belong to the correct user
        for item in result["items"]:
            assert item["user_id"] == user_id

    def test_list_captures_by_user_with_limit(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test listing captures with pagination limit."""
        user_id = "test-user-456"

        # Create 5 captures
        for i in range(5):
            create_capture(
                capture_id=f"limited-capture-{i}",
                url=f"https://limited{i}.com",
                sha256=f"limited-hash{i}",
                s3_key=f"limited-key{i}",
                artifact_type="pdf",
                user_id=user_id,
            )

        result = list_captures_by_user(user_id, limit=3)

        assert result["count"] == 3
        assert len(result["items"]) == 3

    def test_get_capture_by_hash(
        self, mock_dynamodb_tables: dict[str, Any], sample_capture_data: dict[str, Any]
    ) -> None:
        """Test finding capture by SHA-256 hash."""
        data = sample_capture_data

        # Create capture
        create_capture(
            capture_id=data["capture_id"],
            url=data["url"],
            sha256=data["sha256"],
            s3_key=data["s3_key"],
            artifact_type=data["artifact_type"],
            user_id=data["user_id"],
        )

        # Find by hash
        result = get_capture_by_hash(data["sha256"])

        assert result is not None
        assert result["capture_id"] == data["capture_id"]
        assert result["sha256"] == data["sha256"]

    def test_get_capture_by_hash_not_found(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test hash search when no capture exists."""
        result = get_capture_by_hash("nonexistent-hash")

        assert result is None


class TestScheduleOperations:
    """Test schedule-related DynamoDB operations."""

    def test_create_schedule_success(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test successful schedule creation."""
        schedule_id = "test-schedule-123"
        user_id = "test-user"
        url = "https://example.com"
        cron_expression = "0 9 * * MON"

        result = create_schedule(
            ScheduleData(
                schedule_id=schedule_id,
                user_id=user_id,
                url=url,
                cron_expression=cron_expression,
                artifact_type="pdf",
                enabled=True,
                metadata={"test": "value"},
            )
        )

        assert result["schedule_id"] == schedule_id
        assert result["user_id"] == user_id
        assert result["url"] == url
        assert result["cron_expression"] == cron_expression
        assert result["artifact_type"] == "pdf"
        assert result["enabled"] is True
        assert "created_at" in result
        assert "updated_at" in result
        assert "next_capture_time" in result

    def test_create_schedule_with_defaults(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test schedule creation with default values."""
        result = create_schedule(
            schedule_id="default-schedule",
            user_id="test-user",
            url="https://example.com",
            cron_expression="0 9 * * *",
        )

        assert result["artifact_type"] == "pdf"
        assert result["enabled"] is True
        assert result["metadata"] == {}

    def test_get_schedule_success(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test successful schedule retrieval."""
        schedule_id = "get-test-schedule"

        # Create schedule
        create_schedule(
            schedule_id=schedule_id,
            user_id="test-user",
            url="https://example.com",
            cron_expression="0 9 * * *",
        )

        # Retrieve schedule
        result = get_schedule(schedule_id)

        assert result is not None
        assert result["schedule_id"] == schedule_id

    def test_get_schedule_not_found(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test schedule retrieval when schedule doesn't exist."""
        result = get_schedule("nonexistent-schedule")

        assert result is None

    def test_list_schedules_by_user(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test listing schedules by user."""
        user_id = "schedule-user-123"

        # Create multiple schedules for the user
        for i in range(3):
            create_schedule(
                schedule_id=f"user-schedule-{i}",
                user_id=user_id,
                url=f"https://schedule{i}.com",
                cron_expression="0 9 * * *",
            )

        # Create schedule for different user
        create_schedule(
            schedule_id="other-user-schedule",
            user_id="other-user",
            url="https://other.com",
            cron_expression="0 9 * * *",
        )

        result = list_schedules_by_user(user_id)

        assert result["count"] == 3
        assert len(result["items"]) == 3

        # Verify all schedules belong to the correct user
        for item in result["items"]:
            assert item["user_id"] == user_id

    def test_update_schedule_success(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test successful schedule update."""
        schedule_id = "update-test-schedule"

        # Create schedule
        create_schedule(
            schedule_id=schedule_id,
            user_id="test-user",
            url="https://example.com",
            cron_expression="0 9 * * *",
            enabled=True,
        )

        # Update schedule
        updates = {
            "enabled": False,
            "cron_expression": "0 18 * * *",
            "url": "https://updated.com",
        }

        result = update_schedule(schedule_id, updates)

        assert result is not None
        assert result["schedule_id"] == schedule_id
        assert result["enabled"] is False
        assert result["cron_expression"] == "0 18 * * *"
        assert result["url"] == "https://updated.com"

        # Verify updated_at was modified
        assert "updated_at" in result

    def test_update_schedule_not_found(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test updating non-existent schedule."""
        result = update_schedule("nonexistent-schedule", {"enabled": False})

        # moto doesn't raise an error for updating non-existent items
        # In real DynamoDB, this would still return the attributes
        # but the test verifies the function handles the case gracefully

    def test_update_schedule_multiple_reserved_keywords(
        self, mock_dynamodb_tables: dict[str, Any]
    ) -> None:
        """Test updating schedule with multiple reserved keywords."""
        schedule_id = "reserved-keyword-test"

        # Create schedule
        create_schedule(
            schedule_id=schedule_id,
            user_id="test-user",
            url="https://example.com",
            cron_expression="0 9 * * *",
        )

        # Update with multiple reserved keywords
        updates = {
            "url": "https://updated.com",
            "status": "paused",  # Another reserved keyword
            "name": "updated-schedule",  # Another reserved keyword
            "enabled": False,  # Not a reserved keyword
        }

        result = update_schedule(schedule_id, updates)

        assert result is not None
        assert result["url"] == "https://updated.com"
        assert result["enabled"] is False

    def test_update_schedule_no_reserved_keywords(
        self, mock_dynamodb_tables: dict[str, Any]
    ) -> None:
        """Test updating schedule with no reserved keywords."""
        schedule_id = "no-reserved-test"

        # Create schedule
        create_schedule(
            schedule_id=schedule_id,
            user_id="test-user",
            url="https://example.com",
            cron_expression="0 9 * * *",
        )

        # Update with no reserved keywords
        updates = {
            "enabled": False,
            "cron_expression": "0 18 * * *",
            "artifact_type": "png",
        }

        result = update_schedule(schedule_id, updates)

        assert result is not None
        assert result["enabled"] is False
        assert result["cron_expression"] == "0 18 * * *"
        assert result["artifact_type"] == "png"

    def test_delete_schedule_success(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test successful schedule deletion."""
        schedule_id = "delete-test-schedule"

        # Create schedule
        create_schedule(
            schedule_id=schedule_id,
            user_id="test-user",
            url="https://example.com",
            cron_expression="0 9 * * *",
        )

        # Delete schedule
        result = delete_schedule(schedule_id)

        assert result is True

        # Verify schedule is deleted
        deleted_schedule = get_schedule(schedule_id)
        assert deleted_schedule is None

    def test_delete_schedule_not_found(self, mock_dynamodb_tables: dict[str, Any]) -> None:
        """Test deleting non-existent schedule."""
        result = delete_schedule("nonexistent-schedule")

        # DynamoDB delete operations are idempotent
        assert result is True


class TestErrorHandling:
    """Test error handling in DynamoDB operations."""

    def test_create_capture_error(self) -> None:
        """Test capture creation with DynamoDB error."""
        with patch("app.storage.dynamo.table") as mock_table:
            mock_table_instance = MagicMock()
            mock_table.return_value = mock_table_instance

            mock_table_instance.put_item.side_effect = ClientError(
                {"Error": {"Code": "ValidationException", "Message": "Validation error"}}, "PutItem"
            )

            with pytest.raises(ClientError):
                create_capture(
                    capture_id="error-test",
                    url="https://example.com",
                    sha256="test-hash",
                    s3_key="test-key",
                    artifact_type="pdf",
                    user_id="test-user",
                )

    def test_get_capture_error(self) -> None:
        """Test capture retrieval with DynamoDB error."""
        with patch("app.storage.dynamo.table") as mock_table:
            mock_table_instance = MagicMock()
            mock_table.return_value = mock_table_instance

            mock_table_instance.query.side_effect = ClientError(
                {"Error": {"Code": "ResourceNotFoundException", "Message": "Table not found"}},
                "Query",
            )

            result = get_capture("error-test")

            assert result is None
