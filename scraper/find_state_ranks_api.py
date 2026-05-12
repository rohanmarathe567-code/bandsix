"""Find the Elasticsearch API for Top Achievers in Course (state ranks)."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        api_calls = []
        def on_request(req):
            url = req.url
            if "elasticsearch" in url or ("api" in url and "nsw.gov.au" in url):
                api_calls.append(f"[{req.method}] {url[:300]}")
        page.on("request", on_request)

        url = "https://www.nsw.gov.au/education-and-training/nesa/awards-and-events/hsc-merit-lists/top-achievers-course"
        print(f"Loading: {url}")
        await page.goto(url, wait_until="networkidle", timeout=60_000)
        await page.wait_for_timeout(3000)

        print(f"\n=== Elasticsearch/API calls ===")
        for c in api_calls:
            print(c)

        text = await page.inner_text("body")
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        print(f"\n=== Page text (first 40 lines) ===")
        for i, line in enumerate(lines[:40]):
            try:
                print(f"{i:3d}: {line[:120]}")
            except:
                pass

        await browser.close()

asyncio.run(main())
