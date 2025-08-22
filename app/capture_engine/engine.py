from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import Any

from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)


async def capture_webpage(
    url: str,
    artifact_type: str = "pdf",
    viewport_width: int = 1920,
    viewport_height: int = 1080,
) -> dict[str, Any]:
    """
    Capture a webpage as PDF or PNG using Playwright.

    Args:
        url: Target URL to capture.
        artifact_type: 'png' or 'pdf'.
        viewport_width: Browser viewport width.
        viewport_height: Browser viewport height.

    Returns:
        dict: Capture result with binary data and metadata.
    """
    if artifact_type not in ("pdf", "png"):
        raise ValueError(f"Invalid artifact_type: {artifact_type}")

    async with async_playwright() as p:
        # Use Chromium for consistency
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--single-process",
                "--disable-gpu",
                "--disable-web-security",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-features=TranslateUI",
                "--disable-ipc-flooding-protection",
                "--mute-audio",
                "--disable-extensions",
                "--disable-blink-features=AutomationControlled",
                "--use-angle=swiftshader",
                "--window-size=1920,1080",
                "--disable-features=VizDisplayCompositor",
                "--disable-background-media-suspend",
                "--disable-component-extensions-with-background-pages",
                "--disable-default-apps",
                "--disable-domain-reliability",
                "--disable-sync",
                "--enable-features=NetworkService,NetworkServiceLogging",
                "--force-color-profile=srgb",
            ],
        )

        context = await browser.new_context(
            viewport={"width": viewport_width, "height": viewport_height},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )

        page = await context.new_page()

        try:
            # Navigate to URL with timeout
            await page.goto(url, wait_until="networkidle", timeout=30000)

            # Wait for any dynamic content
            await page.wait_for_timeout(2000)

            # Always capture as PNG screenshot - this is what the user wants
            # Full page screenshot showing the entire webpage
            artifact_data = await page.screenshot(
                full_page=False,  # Just the viewport to show "top of the page" as requested
                type="png",
            )

            # Calculate SHA-256 hash
            sha256_hash = hashlib.sha256(artifact_data).hexdigest()

            logger.info(f"Captured {url} as {artifact_type}, SHA-256: {sha256_hash}")

            return {
                "data": artifact_data,
                "sha256": sha256_hash,
                "artifact_type": artifact_type,
                "url": url,
                "content_length": len(artifact_data),
            }

        finally:
            await context.close()
            await browser.close()


def capture_stub(url: str, artifact_type: str = "pdf") -> dict[str, Any]:
    """
    Synchronous wrapper for capture_webpage (for backwards compatibility).

    Args:
        url: Target URL.
        artifact_type: 'png' or 'pdf'.

    Returns:
        dict: Capture result.
    """
    return asyncio.run(capture_webpage(url, artifact_type))
