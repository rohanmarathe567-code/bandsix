"""
Extract subject/scaling data from hscninja's JS bundles and API endpoints.
"""
import asyncio, json, re, sys
from playwright.async_api import async_playwright

JS_CHUNKS = [
    "https://www.hscninja.com/_next/static/chunks/app/atar-calculator/page-1685ad575803e273.js",
    "https://www.hscninja.com/_next/static/chunks/9779-e137660880633ba2.js",
    "https://www.hscninja.com/_next/static/chunks/8695-faa5938f54425a28.js",
    "https://www.hscninja.com/_next/static/chunks/1302-2a28e3fb71dea2a9.js",
    "https://www.hscninja.com/_next/static/chunks/386-e4cb90142cd7b65d.js",
    "https://www.hscninja.com/_next/static/chunks/7219-0308bd4b5d3dbaef.js",
]

API_ENDPOINTS = [
    "https://www.hscninja.com/api/schools",
    "https://www.hscninja.com/api/courses",
    "https://www.hscninja.com/api/subjects",
    "https://www.hscninja.com/api/scaling",
    "https://www.hscninja.com/api/atar/subjects",
    "https://www.hscninja.com/api/atar/courses",
]

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )

        # ── 1. Try API endpoints ────────────────────────────────────────────
        print("=== Testing API endpoints ===")
        for url in API_ENDPOINTS:
            try:
                resp = await context.request.get(url, timeout=10000)
                body = await resp.text()
                print(f"\n{url} -> {resp.status}")
                if resp.status == 200:
                    print(body[:3000])
            except Exception as e:
                print(f"{url} → ERROR: {e}")

        # ── 2. Fetch JS chunks and search for course data ───────────────────
        print("\n\n=== Searching JS chunks for course/scaling data ===")
        for url in JS_CHUNKS:
            try:
                resp = await context.request.get(url, timeout=15000)
                body = await resp.text()
                print(f"\n--- {url} ({len(body)} bytes) ---")

                # Look for course name patterns
                names = re.findall(r'"name"\s*:\s*"([^"]{10,60})"', body)
                if names:
                    print(f"  'name' fields found: {len(names)}")
                    for n in names[:30]:
                        print(f"    {n}")

                # Look for scaling-related numbers
                slopes = re.findall(r'"slope"\s*:\s*([\d.]+)', body)
                if slopes:
                    print(f"  'slope' values: {slopes[:20]}")

                # Look for subject arrays
                subject_matches = re.findall(r'\{[^{}]*"(?:courseCode|course_code|subject|name)"[^{}]*\}', body)
                if subject_matches:
                    print(f"  Subject-like objects: {len(subject_matches)}")
                    for m in subject_matches[:10]:
                        print(f"    {m[:200]}")

                # Look for large JSON arrays
                arrays = re.findall(r'\[(\{[^[\]]{50,}?\}(?:,\{[^[\]]{20,}?\}){3,})\]', body)
                if arrays:
                    print(f"  Large JSON arrays: {len(arrays)}")
                    for a in arrays[:3]:
                        print(f"    [{a[:300]}]")

            except Exception as e:
                print(f"  ERROR: {e}")

        # ── 3. Load the ATAR calculator page and extract data via JS ────────
        print("\n\n=== Loading ATAR calculator page and extracting via JS ===")
        page = await context.new_page()

        course_data = []
        async def capture_response(response):
            url = response.url
            if "hscninja.com/api" in url:
                try:
                    body = await response.text()
                    print(f"[API hit] {url}: {body[:500]}")
                    course_data.append((url, body))
                except:
                    pass

        page.on("response", capture_response)
        await page.goto("https://www.hscninja.com/atar-calculator", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

        # Try to get subjects by interacting with the page
        subjects = await page.evaluate("""() => {
            // Search React fiber for props data
            function findReactFiber(el) {
                for (const key of Object.keys(el)) {
                    if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
                        return el[key];
                    }
                }
                return null;
            }

            function searchFiber(fiber, depth=0) {
                if (!fiber || depth > 20) return null;
                const props = fiber.memoizedProps || fiber.pendingProps;
                if (props) {
                    const str = JSON.stringify(props);
                    if (str.includes('slope') || str.includes('courseCode') || str.includes('scaling')) {
                        return str.substring(0, 5000);
                    }
                }
                const result = searchFiber(fiber.child, depth+1) || searchFiber(fiber.sibling, depth+1);
                return result;
            }

            // Try to find any element with React data
            const els = document.querySelectorAll('[data-slot], button, select, [class*="select"]');
            for (const el of els) {
                const fiber = findReactFiber(el);
                if (fiber) {
                    const result = searchFiber(fiber);
                    if (result) return result;
                }
            }

            // Also try window object
            for (const key of Object.keys(window)) {
                try {
                    const val = window[key];
                    if (val && typeof val === 'object') {
                        const str = JSON.stringify(val);
                        if (str.includes('slope') || str.includes('Mathematics Extension')) {
                            return str.substring(0, 5000);
                        }
                    }
                } catch(e) {}
            }
            return null;
        }""")

        if subjects:
            print("Found subjects data via React fiber/window:")
            print(subjects[:5000])
        else:
            print("No subjects data found in React fiber")

        await browser.close()

asyncio.run(main())
