"""Find the correct NESA Distinguished Achievers URL on the new NSW Gov site."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        # Try the new NSW Gov site
        urls_to_try = [
            "https://www.nsw.gov.au/education-and-training/nesa",
            "https://www.nsw.gov.au/education-and-training/nesa/hsc",
            "https://nesa.nsw.edu.au/hsc-results",
        ]

        for url in urls_to_try:
            print(f"\n=== Checking: {url} ===")
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                await page.wait_for_timeout(3000)
                final_url = page.url
                print(f"Final URL: {final_url}")
                title = await page.title()
                print(f"Title: {title}")
                # Get all links containing "distinguish" or "achiever" or "hsc"
                links = await page.evaluate("""
                    () => Array.from(document.querySelectorAll('a'))
                        .map(a => ({href: a.href, text: a.innerText.trim()}))
                        .filter(a => a.href && (
                            a.href.toLowerCase().includes('distinguish') ||
                            a.href.toLowerCase().includes('achiever') ||
                            a.href.toLowerCase().includes('honour') ||
                            a.text.toLowerCase().includes('distinguish') ||
                            a.text.toLowerCase().includes('achiever') ||
                            a.text.toLowerCase().includes('honour roll')
                        ))
                """)
                if links:
                    print(f"Relevant links found: {len(links)}")
                    for l in links[:20]:
                        print(f"  [{l['text'][:50]}] -> {l['href']}")
                else:
                    print("No relevant links found")
            except Exception as e:
                print(f"Error: {e}")

        await browser.close()

asyncio.run(main())
