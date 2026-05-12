"""Browse NESA site to find Distinguished Achievers data."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        url = "https://www.nsw.gov.au/education-and-training/nesa/hsc"
        print(f"Loading: {url}")
        await page.goto(url, wait_until="networkidle", timeout=60_000)
        await page.wait_for_timeout(2000)

        # Get all links on the page
        links = await page.evaluate("""
            () => Array.from(document.querySelectorAll('a'))
                .map(a => ({href: a.href, text: a.innerText.trim().substring(0, 80)}))
                .filter(a => a.href && a.text)
        """)
        print(f"Total links: {len(links)}")
        print("All links:")
        for l in links:
            print(f"  [{l['text']}] -> {l['href']}")

        # Get page text
        text = await page.inner_text("body")
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        print(f"\n=== Page text (first 100 lines) ===")
        for i, line in enumerate(lines[:100]):
            print(f"{i:3d}: {line[:120]}")

        await browser.close()

asyncio.run(main())
