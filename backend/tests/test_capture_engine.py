"""Tests for the capture engine module."""

from __future__ import annotations

import hashlib
from typing import Any
from unittest.mock import patch

import pytest

from app.capture_engine.engine import capture_stub, capture_webpage


class TestCaptureWebpage:
    """Test the main capture webpage functionality."""

    @pytest.mark.asyncio
    async def test_capture_pdf_success(self, mock_playwright: dict[str, Any]) -> None:
        """Test successful PDF capture."""
        url = "https://example.com"
        artifact_type = "pdf"

        result = await capture_webpage(url, artifact_type)

        assert result["url"] == url
        assert result["artifact_type"] == artifact_type
        assert result["data"] == b"fake_pdf_content"
        assert result["content_length"] == len(b"fake_pdf_content")

        # Verify SHA-256 hash is correct
        expected_hash = hashlib.sha256(b"fake_pdf_content").hexdigest()
        assert result["sha256"] == expected_hash

    @pytest.mark.asyncio
    async def test_capture_png_success(self, mock_playwright: dict[str, Any]) -> None:
        """Test successful PNG capture."""
        url = "https://example.com"
        artifact_type = "png"

        result = await capture_webpage(url, artifact_type)

        assert result["url"] == url
        assert result["artifact_type"] == artifact_type
        assert result["data"] == b"fake_png_content"
        assert result["content_length"] == len(b"fake_png_content")

        # Verify SHA-256 hash is correct
        expected_hash = hashlib.sha256(b"fake_png_content").hexdigest()
        assert result["sha256"] == expected_hash

    @pytest.mark.asyncio
    async def test_capture_invalid_artifact_type(self, mock_playwright: dict[str, Any]) -> None:
        """Test capture with invalid artifact type."""
        url = "https://example.com"
        artifact_type = "invalid"

        with pytest.raises(ValueError, match="Invalid artifact_type: invalid"):
            await capture_webpage(url, artifact_type)

    @pytest.mark.asyncio
    async def test_capture_with_custom_viewport(self, mock_playwright: dict[str, Any]) -> None:
        """Test capture with custom viewport settings."""
        url = "https://example.com"
        viewport_width = 1600
        viewport_height = 900

        result = await capture_webpage(
            url, viewport_width=viewport_width, viewport_height=viewport_height
        )

        # Verify browser context was called with correct viewport
        mock_browser = mock_playwright["browser"]
        mock_browser.new_context.assert_called_once()
        context_kwargs = mock_browser.new_context.call_args[1]

        assert context_kwargs["viewport"]["width"] == viewport_width
        assert context_kwargs["viewport"]["height"] == viewport_height

    @pytest.mark.asyncio
    async def test_capture_browser_lifecycle(self, mock_playwright: dict[str, Any]) -> None:
        """Test that browser and context are properly closed."""
        url = "https://example.com"

        await capture_webpage(url)

        # Verify browser lifecycle
        mock_browser = mock_playwright["browser"]
        mock_context = mock_playwright["context"]

        mock_context.close.assert_called_once()
        mock_browser.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_capture_page_navigation(self, mock_playwright: dict[str, Any]) -> None:
        """Test that page navigation is called correctly."""
        url = "https://example.com"

        await capture_webpage(url)

        # Verify page navigation
        mock_page = mock_playwright["page"]

        mock_page.goto.assert_called_once_with(url, wait_until="networkidle", timeout=30000)

    @pytest.mark.asyncio
    async def test_capture_pdf_generation(self, mock_playwright: dict[str, Any]) -> None:
        """Test PDF generation with correct parameters."""
        url = "https://example.com"
        artifact_type = "pdf"

        await capture_webpage(url, artifact_type)

        # Verify PDF generation
        mock_page = mock_playwright["page"]

        mock_page.pdf.assert_called_once_with(
            format="A4",
            print_background=True,
            margin={"top": "1cm", "bottom": "1cm", "left": "1cm", "right": "1cm"},
        )

    @pytest.mark.asyncio
    async def test_capture_screenshot_generation(self, mock_playwright: dict[str, Any]) -> None:
        """Test screenshot generation with correct parameters."""
        url = "https://example.com"
        artifact_type = "png"

        await capture_webpage(url, artifact_type)

        # Verify screenshot generation
        mock_page = mock_playwright["page"]

        mock_page.screenshot.assert_called_once_with(
            full_page=True,
            type="png",
        )


class TestCaptureStub:
    """Test the synchronous capture stub wrapper."""

    def test_capture_stub_pdf(self) -> None:
        """Test capture stub for PDF."""
        url = "https://example.com"
        artifact_type = "pdf"

        with patch("app.capture_engine.engine.capture_webpage") as mock_capture:
            mock_capture.return_value = {
                "data": b"test_data",
                "sha256": "test_hash",
                "artifact_type": artifact_type,
                "url": url,
                "content_length": 9,
            }

            result = capture_stub(url, artifact_type)

            assert result["url"] == url
            assert result["artifact_type"] == artifact_type

    def test_capture_stub_png(self) -> None:
        """Test capture stub for PNG."""
        url = "https://example.com"
        artifact_type = "png"

        with patch("app.capture_engine.engine.capture_webpage") as mock_capture:
            mock_capture.return_value = {
                "data": b"test_data",
                "sha256": "test_hash",
                "artifact_type": artifact_type,
                "url": url,
                "content_length": 9,
            }

            result = capture_stub(url, artifact_type)

            assert result["url"] == url
            assert result["artifact_type"] == artifact_type

    def test_capture_stub_default_type(self) -> None:
        """Test capture stub with default artifact type."""
        url = "https://example.com"

        with patch("app.capture_engine.engine.capture_webpage") as mock_capture:
            mock_capture.return_value = {
                "data": b"test_data",
                "sha256": "test_hash",
                "artifact_type": "pdf",
                "url": url,
                "content_length": 9,
            }

            result = capture_stub(url)

            assert result["artifact_type"] == "pdf"
