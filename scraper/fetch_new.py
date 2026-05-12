"""Fetch new NESA Distinguished Achievers pages and show structure."""
import asyncio
import sys
from playwright.async_api import async_playwright

BASE = "https://www.nsw.gov.au/education-and-training/nesa/awards-and-events/hsc-merit-lists/distinguished-achievers"

async def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2025
    url = f"{BASE}/{year}"

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        requests_log = []
        def on_request(req):
            url = req.url
            if not any(x in url for x in [".js", ".css", ".png", ".jpg", ".woff", ".svg", ".gif", "google", "hotjar", "gtm", "analytics"]):
                requests_log.append(f"[{req.method}] {url}")
        page.on("request", on_request)

        print(f"Loading: {url}")
        await page.goto(url, wait_until="networkidle", timeout=60_000)
        await page.wait_for_timeout(3000)

        print(f"Final URL: {page.url}")
        print(f"Title: {await page.title()}")

        # Show network requests
        print(f"\n=== API/Data requests ===")
        for r in requests_log:
            print(r)

        # Save HTML
        html = await page.content()
        with open(f"new_page_{year}.html", "w", encoding="utf-8") as f:
            f.write(html)
        print(f"\nSaved {len(html)} bytes to new_page_{year}.html")

        # Show body text
        text = await page.inner_text("body")
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        print(f"\n=== Page text (first 100 lines) ===")
        for i, line in enumerate(lines[:100]):
            try:
                print(f"{i:3d}: {line[:120]}")
            except UnicodeEncodeError:
                print(f"{i:3d}: [unicode encode error]")

        await browser.close()

asyncio.run(main())
