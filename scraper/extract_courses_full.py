"""Extract full course list and scaling data from hscninja via React fiber."""
import asyncio, json, sys, re, os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        await page.goto("https://www.hscninja.com/atar-calculator", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

        # Extract full courses array from React fiber props
        result = await page.evaluate("""() => {
            function findReactFiber(el) {
                for (const key of Object.keys(el)) {
                    if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
                        return el[key];
                    }
                }
                return null;
            }

            function searchFiber(fiber, depth=0) {
                if (!fiber || depth > 30) return null;
                const props = fiber.memoizedProps || fiber.pendingProps;
                if (props && props.courses && Array.isArray(props.courses) && props.courses.length > 10) {
                    return {
                        courses: props.courses,
                        scalingData: props.scalingData || props.scaling || null,
                        allProps: Object.keys(props),
                    };
                }
                const result = searchFiber(fiber.child, depth+1) || searchFiber(fiber.sibling, depth+1);
                return result;
            }

            // Search all elements
            const all = document.querySelectorAll('*');
            for (const el of all) {
                const fiber = findReactFiber(el);
                if (fiber) {
                    const result = searchFiber(fiber);
                    if (result) return result;
                }
            }
            return null;
        }""")

        if result:
            courses = result.get('courses', [])
            scaling = result.get('scalingData')
            print(f"Found {len(courses)} courses")
            print(f"Prop keys: {result.get('allProps', [])}")
            print(f"Has scaling data: {scaling is not None}")
            print()
            print("=== FULL COURSE LIST ===")
            for c in courses:
                print(json.dumps(c))
            if scaling:
                print("\n=== SCALING DATA ===")
                print(json.dumps(scaling, indent=2)[:5000])
        else:
            # Try broader search
            print("Broad fiber search failed, trying JS global search...")
            data = await page.evaluate("""() => {
                // Search all React root containers
                const roots = document.querySelectorAll('[id="__next"], [id="root"], main, body');
                function findFiber(el) {
                    for (const key of Object.keys(el)) {
                        if (key.startsWith('__react')) return el[key];
                    }
                    return null;
                }
                function walk(fiber, found=[], depth=0) {
                    if (!fiber || depth > 50) return found;
                    const props = fiber.memoizedProps;
                    if (props && props.courses && props.courses.length > 5) {
                        found.push({courses: props.courses, keys: Object.keys(props)});
                    }
                    walk(fiber.child, found, depth+1);
                    walk(fiber.sibling, found, depth+1);
                    return found;
                }
                for (const root of roots) {
                    const fiber = findFiber(root);
                    if (fiber) {
                        const found = walk(fiber);
                        if (found.length) return found[0];
                    }
                }
                return null;
            }""")
            if data:
                courses = data.get('courses', [])
                print(f"Found {len(courses)} courses via broad search")
                for c in courses:
                    print(json.dumps(c))
            else:
                print("No data found")

        # Also try to find scaling data by looking for numbers near course names in JS
        print("\n=== Checking JS bundle for scaling data ===")
        resp = await context.request.get(
            "https://www.hscninja.com/_next/static/chunks/app/atar-calculator/page-1685ad575803e273.js"
        )
        js = await resp.text()
        # Look for pattern like slope/intercept near course codes
        patterns = [
            r'(?:slope|intercept|mean|scaled|cutoff)\s*:\s*[\d.]+',
            r'\d{5}[^"]*(?:slope|intercept)',
            r'"15\d{3}"[^}]*\}',
        ]
        for pat in patterns:
            found = re.findall(pat, js)
            if found:
                print(f"\nPattern '{pat}':")
                for f in found[:20]:
                    print(f"  {f}")

        await browser.close()

asyncio.run(main())
