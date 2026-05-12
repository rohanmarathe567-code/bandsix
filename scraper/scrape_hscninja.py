"""
Scrape hscninja.com to extract ATAR calculator subject/scaling data
and understand student search functionality.
Uses Playwright to capture network requests.
"""
import asyncio, json, sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        captured = {}

        async def on_response(response):
            url = response.url
            if any(k in url for k in ["/api/", "subjects", "courses", "scaling", "atar"]):
                try:
                    body = await response.text()
                    captured[url] = body[:5000]
                    print(f"[API] {url[:120]}")
                except:
                    pass

        page.on("response", on_response)

        # ── 1. ATAR Calculator ──────────────────────────────────────────────
        print("\n=== Loading ATAR Calculator ===")
        await page.goto("https://www.hscninja.com/atar-calculator", wait_until="networkidle", timeout=60_000)
        await page.wait_for_timeout(3000)

        # Try to grab __NEXT_DATA__
        next_data = await page.evaluate("() => { try { return JSON.stringify(window.__NEXT_DATA__) } catch(e) { return null } }")
        if next_data:
            print("\n=== __NEXT_DATA__ found ===")
            parsed = json.loads(next_data)
            print(json.dumps(parsed, indent=2)[:8000])
        else:
            print("No __NEXT_DATA__ found")

        # Try to find subjects data in page JS variables
        subjects_data = await page.evaluate("""() => {
            // Try common variable names
            for (const key of ['__subjects', '__courses', 'subjects', 'courses', 'SUBJECTS', 'COURSES']) {
                if (window[key]) return JSON.stringify(window[key]);
            }
            // Try Next.js page props
            try {
                const scripts = document.querySelectorAll('script[id="__NEXT_DATA__"]');
                if (scripts.length > 0) return scripts[0].textContent;
            } catch(e) {}
            return null;
        }""")
        if subjects_data:
            print("\n=== Subjects data found in JS ===")
            print(subjects_data[:5000])

        # Look for subject options in the DOM
        print("\n=== DOM subject options ===")
        options = await page.evaluate("""() => {
            const opts = [];
            // React-select or native selects
            document.querySelectorAll('[class*="option"]').forEach(el => {
                const text = el.textContent.trim();
                if (text) opts.push(text);
            });
            return opts.slice(0, 200);
        }""")
        for o in options[:30]:
            print(f"  {o}")

        # Try clicking on the subject dropdown to trigger loading
        print("\n=== Trying to open subject dropdown ===")
        try:
            await page.click("input[placeholder*='subject'], input[placeholder*='Subject'], [class*='select__input']", timeout=5000)
            await page.wait_for_timeout(2000)
            # Get all visible options
            opts = await page.evaluate("""() => {
                const els = document.querySelectorAll('[class*="option"], [role="option"]');
                return Array.from(els).map(el => el.textContent.trim()).filter(t => t.length > 0);
            }""")
            print(f"Found {len(opts)} dropdown options:")
            for o in opts[:150]:
                print(f"  {o}")
        except Exception as e:
            print(f"  Could not click dropdown: {e}")

        # ── 2. Check student search ─────────────────────────────────────────
        print("\n\n=== Checking student search ===")
        for url in ["https://www.hscninja.com/students",
                    "https://www.hscninja.com/search",
                    "https://www.hscninja.com/honour-roll/students"]:
            try:
                resp = await context.request.get(url)
                print(f"  {url}: {resp.status}")
            except Exception as e:
                print(f"  {url}: error — {e}")

        # ── 3. Print all captured API calls ────────────────────────────────
        print("\n\n=== All captured API calls ===")
        for url, body in captured.items():
            print(f"\n--- {url} ---")
            print(body[:2000])

        # ── 4. Find all script chunks that mention courses/subjects ─────────
        print("\n\n=== Scanning JS chunks for subject data ===")
        scripts = await page.evaluate("""() => {
            return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
        }""")
        print(f"Found {len(scripts)} script tags:")
        for s in scripts:
            print(f"  {s}")

        await browser.close()

asyncio.run(main())
