"""Fetch a sample NESA page and print its text structure to understand the layout."""
import asyncio
import sys
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

async def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2025
    url = f"https://educationstandards.nsw.edu.au/wps/portal/nesa/about/events/{year}/distinguished-achievers"
    print(f"Fetching: {url}")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        await page.wait_for_timeout(3000)

        # Dump raw HTML to file
        html = await page.content()
        with open("sample_page.html", "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Saved {len(html)} bytes to sample_page.html")

        # Also print text
        text = await page.inner_text("body")
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        print(f"\n=== First 200 non-empty lines of body text ===")
        for i, line in enumerate(lines[:200]):
            print(f"{i:3d}: {line[:120]}")

        await browser.close()

asyncio.run(main())
