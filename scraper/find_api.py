"""Intercept network requests on NESA page to find actual data endpoint."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    requests_log = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        def on_request(req):
            url = req.url
            # Log only relevant requests (skip fonts, images, analytics)
            if not any(x in url for x in ["font", "google-analytics", "hotjar", "gtm", ".js", ".css", ".png", ".jpg", ".woff", ".ttf", ".svg"]):
                requests_log.append(f"[{req.method}] {url}")

        page.on("request", on_request)

        url = "https://educationstandards.nsw.edu.au/wps/portal/nesa/about/events/2025/distinguished-achievers"
        print(f"Loading: {url}")
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        await page.wait_for_timeout(8000)  # Wait longer for AJAX

        print(f"\n=== Network requests (filtered) ===")
        for r in requests_log:
            print(r)

        # Also check if there's an iframe with the actual content
        frames = page.frames
        print(f"\n=== Frames: {len(frames)} ===")
        for f in frames:
            print(f"  URL: {f.url}")

        await browser.close()

asyncio.run(main())
