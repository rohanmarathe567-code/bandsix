"""
BandSix Historical NESA Scraper (2001–2016)
============================================
Scrapes NSW HSC Distinguished Achievers data from the Board of Studies
static HTML pages at boardofstudies.nsw.edu.au for years 2001-2016.

Page structure:
  - Each year has an index page at DSACH_{YEAR}_12[.html|.htm]
  - The index links to sub-pages with the actual data tables
  - 2016: single-letter pages (DSACH_2016_12_A.html ... _Z.html)
  - 2001-2015: numbered sub-pages (DSACH_{YEAR}_12_A1[.html|.htm] etc.)
  - Courses 2001-2014: comma-separated codes (e.g. "15040, 15250")
  - Courses 2015-2016: concatenated code+name (e.g. "15140 - English (Advanced)15240 - Mathematics")

Usage:
    python scrape_historical.py [--year YEAR] [--all-years] [--dry-run]

Requirements:
    pip install beautifulsoup4 lxml supabase python-dotenv tqdm
"""

import os
import re
import sys
import json
import time
import argparse
import logging
import urllib.request
from typing import Optional
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from supabase import create_client, Client
from tqdm import tqdm

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("bandsix-historical")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

BASE_URL = "https://www.boardofstudies.nsw.edu.au/ebos/static/"
HEADERS  = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"}
REQUEST_DELAY = 0.15  # seconds between HTTP requests

# Years where courses are "code - name" concatenated (2015-2016)
# Years 2001-2014 use comma-separated code-only format
CODE_NAME_YEARS = {2015, 2016}

# ─── Year config ─────────────────────────────────────────────────────────────

def get_year_config(year: int) -> dict:
    """Return the index URL and file extension for a given year."""
    if year == 2016:
        return {"index": f"DSACH_{year}_12_A.html", "ext": "html", "format": "letters"}
    elif year >= 2009:
        return {"index": f"DSACH_{year}_12.html", "ext": "html", "format": "numbered"}
    else:
        return {"index": f"DSACH_{year}_12.htm",  "ext": "htm",  "format": "numbered"}


HISTORICAL_YEARS = list(range(2001, 2017))  # 2001 through 2016 inclusive

# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def fetch_html(url: str, retries: int = 3) -> Optional[str]:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1)
            else:
                log.warning(f"    Failed to fetch {url}: {e}")
                return None


def get_subpage_links(year: int, config: dict) -> list[str]:
    """Fetch index page and return list of sub-page filenames (relative)."""
    index_url = BASE_URL + config["index"]
    html = fetch_html(index_url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    seen = set()
    links = []

    for a in soup.find_all("a"):
        href = a.get("href", "")
        if "DSACH" in href and href not in seen:
            seen.add(href)
            links.append(href)

    if config["format"] == "letters":
        # For 2016: the _A page itself is data; add it, plus all linked B-Z pages
        links = [config["index"]] + links

    return links

# ─── Course parsing ───────────────────────────────────────────────────────────

def split_code_name_courses(raw: str) -> list[str]:
    """Split concatenated 'CODE - Name' string into individual course strings."""
    parts = re.split(r"(?=\d{5}\s*-\s*)", raw.strip())
    return [p.strip() for p in parts if p.strip()]


def normalize_course_name(raw: str) -> str:
    """Strip leading course code and 'Examination' suffix."""
    name = re.sub(r"^\d+\s*-\s*", "", raw).strip()
    name = re.sub(r"\s+Examination$", "", name, flags=re.IGNORECASE).strip()
    return name


def split_code_only_courses(raw: str, code_map: dict[str, str]) -> list[str]:
    """Split comma-separated code list and look up names."""
    codes = [c.strip() for c in raw.split(",") if c.strip()]
    names = []
    for code in codes:
        if code in code_map:
            names.append(code_map[code])
        else:
            # Store a synthetic name so data isn't lost
            names.append(f"Course {code}")
    return names

# ─── Page parsing ────────────────────────────────────────────────────────────

def parse_subpage(year: int, filename: str, code_map: dict[str, str]) -> list[dict]:
    """Download a sub-page and extract student records."""
    url = BASE_URL + filename
    html = fetch_html(url)
    time.sleep(REQUEST_DELAY)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    records = []

    # Find the main data table (has 3 columns: student, school, courses)
    data_table = None
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) > 3:
            headers = [th.get_text(strip=True).lower() for th in t.find_all("th")]
            header_text = " ".join(headers)
            if "student" in header_text or "school" in header_text:
                data_table = t
                break
        # fallback: first table with enough rows
        if data_table is None and len(rows) > 3:
            cells = [td.get_text(strip=True) for td in rows[1].find_all(["td", "th"])]
            if len(cells) >= 3:
                data_table = t

    if data_table is None:
        return []

    rows = data_table.find_all("tr")
    for row in rows[1:]:  # skip header
        cells = [td.get_text(strip=True) for td in row.find_all("td")]
        if len(cells) < 3:
            continue

        raw_name   = cells[0].strip()
        school     = cells[1].strip()
        raw_course = cells[2].strip()

        if not raw_name or not school or not raw_course:
            continue

        # Parse "Last, First [Middle]" format
        if "," in raw_name:
            last, _, rest = raw_name.partition(",")
            first = rest.strip()
            last  = last.strip()
        else:
            # Unusual — treat whole thing as last name
            first = ""
            last  = raw_name

        # Expand courses
        if year in CODE_NAME_YEARS:
            course_strings = split_code_name_courses(raw_course)
            course_names = [normalize_course_name(c) for c in course_strings]
        else:
            course_names = split_code_only_courses(raw_course, code_map)

        for course_name in course_names:
            if not course_name or course_name.startswith("Course "):
                # only store if we have a real name
                if not course_name:
                    continue
            records.append({
                "first_name": first,
                "last_name": last,
                "school": school,
                "course": course_name,
            })

        # Also populate code_map for future years while parsing 2015/2016
        if year in CODE_NAME_YEARS:
            for cs in split_code_name_courses(raw_course):
                m = re.match(r"^(\d+)\s*-\s*(.+)$", cs.strip())
                if m:
                    code_map[m.group(1)] = normalize_course_name(cs)

    return records

# ─── Shared DB helpers (copied from scraper.py) ──────────────────────────────

def slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text[:100]


CATHOLIC_KEYWORDS = [
    "catholic", "marist", "salesian", "lasalle", "la salle", "mercy",
    "dominican", "presentation", "immaculate", "assumption", "xavier",
    "ignatius", "joseph", "mary", "patrick", "paul's", "peter", "michael",
    "john", "anne", "pius", "augustine", "francis", "teresa", "thomas",
    "luke", "mark", "margaret", "brigid", "columba", "vincent", "cathedral",
    "st ", "holy ",
]
INDEPENDENT_KEYWORDS = [
    "grammar", "scots", "shore", "barker", "knox", "kambala", "pymble",
    "ravenswood", "cranbrook", "abbotsleigh", "newington", "king's", "king ",
    "tara", "frensham", "ascham", "loreto", "meriden", "stella", "monte",
    "trinity", "sydney boys", "sydney girls", "wahroonga", "armidale",
    "chevalier", "hunter valley", "arden", "kincoppal", "mercedes",
    "normanhurst", "reddam", "riverview", "ruse", "james ruse",
]


def classify_school(name: str) -> str:
    lower = name.lower()
    for kw in CATHOLIC_KEYWORDS:
        if kw in lower:
            return "catholic"
    for kw in INDEPENDENT_KEYWORDS:
        if kw in lower:
            return "independent"
    if "high school" in lower or " high " in lower or lower.endswith(" high"):
        return "public"
    return "other"


def classify_course(name: str) -> str:
    lower = name.lower()
    if "mathematics" in lower or "maths" in lower:
        return "Mathematics"
    if "english" in lower:
        return "English"
    if "physics" in lower or "chemistry" in lower or "biology" in lower or "earth and environmental" in lower or "science" in lower:
        return "Science"
    if "history" in lower or "geography" in lower or "economics" in lower or "legal" in lower or "business" in lower or "society" in lower or "studies of religion" in lower or "ancient" in lower or "modern" in lower:
        return "HSIE"
    if "music" in lower or "drama" in lower or "visual arts" in lower or "dance" in lower or "film" in lower or "photog" in lower:
        return "Creative Arts"
    if "software" in lower or "enterprise computing" in lower or "industrial" in lower or "information processes" in lower or "textiles" in lower or "agriculture" in lower or "food" in lower or "design and technology" in lower or "engineering studies" in lower or "graphics" in lower:
        return "TAS"
    if "physical education" in lower or "community and family" in lower or "health" in lower:
        return "PD/H/PE"
    if any(lang in lower for lang in ["french", "japanese", "chinese", "korean", "italian", "german", "spanish", "arabic", "vietnamese", "modern greek", "indonesian", "hindi", "classical", "latin", "continuers", "background speakers"]):
        return "Languages"
    if "vet" in lower or "vocational" in lower or "construction" in lower or "hospitality" in lower or "retail" in lower:
        return "VET"
    return "Other"


def get_course_units(name: str) -> int:
    lower = name.lower()
    if "extension 2" in lower or "ext 2" in lower:
        return 1
    return 2


def is_extension_course(name: str) -> bool:
    lower = name.lower()
    return "extension" in lower or "ext " in lower


def load_cache_from_db(supabase: Client) -> tuple[dict, dict]:
    log.info("  Pre-loading school/course caches from DB...")
    school_cache: dict = {}
    course_cache: dict = {}

    offset = 0
    while True:
        result = supabase.table("schools").select("id, name").range(offset, offset + 999).execute()
        rows = result.data or []
        for r in rows:
            school_cache[r["name"]] = r["id"]
        if len(rows) < 1000:
            break
        offset += 1000

    offset = 0
    while True:
        result = supabase.table("courses").select("id, name").range(offset, offset + 999).execute()
        rows = result.data or []
        for r in rows:
            course_cache[r["name"]] = r["id"]
        if len(rows) < 1000:
            break
        offset += 1000

    log.info(f"  Loaded {len(school_cache)} schools, {len(course_cache)} courses")
    return school_cache, course_cache


def bulk_ensure_schools(supabase: Client, names: list[str], cache: dict) -> None:
    missing = [n for n in names if n not in cache]
    if not missing:
        return

    existing_slugs: set = set()
    offset = 0
    while True:
        result = supabase.table("schools").select("slug").range(offset, offset + 999).execute()
        rows = result.data or []
        existing_slugs.update(r["slug"] for r in rows)
        if len(rows) < 1000:
            break
        offset += 1000

    to_insert = []
    used_slugs = set(existing_slugs)
    for name in missing:
        base_slug = slugify(name)
        slug = base_slug
        i = 1
        while slug in used_slugs:
            slug = f"{base_slug}-{i}"
            i += 1
        used_slugs.add(slug)
        to_insert.append({"name": name, "type": classify_school(name), "slug": slug})

    for i in range(0, len(to_insert), 50):
        chunk = to_insert[i:i + 50]
        result = supabase.table("schools").insert(chunk).execute()
        for s in (result.data or []):
            cache[s["name"]] = s["id"]

    log.info(f"  Created {len(missing)} new schools")


def bulk_ensure_courses(supabase: Client, names: list[str], cache: dict) -> None:
    missing = [n for n in names if n not in cache]
    if not missing:
        return

    existing_slugs: set = set()
    offset = 0
    while True:
        result = supabase.table("courses").select("slug").range(offset, offset + 999).execute()
        rows = result.data or []
        existing_slugs.update(r["slug"] for r in rows)
        if len(rows) < 1000:
            break
        offset += 1000

    to_insert = []
    used_slugs = set(existing_slugs)
    for name in missing:
        base_slug = slugify(name)
        slug = base_slug
        i = 1
        while slug in used_slugs:
            slug = f"{base_slug}-{i}"
            i += 1
        used_slugs.add(slug)
        to_insert.append({
            "name": name, "slug": slug,
            "category": classify_course(name),
            "units": get_course_units(name),
            "is_extension": is_extension_course(name),
        })

    for i in range(0, len(to_insert), 50):
        chunk = to_insert[i:i + 50]
        result = supabase.table("courses").insert(chunk).execute()
        for c in (result.data or []):
            cache[c["name"]] = c["id"]

    log.info(f"  Created {len(missing)} new courses")


CODE_MAP_CACHE_FILE = os.path.join(os.path.dirname(__file__), "code_map_cache.json")


def build_code_map(force: bool = False) -> dict[str, str]:
    """
    Build a course-code -> course-name map from the 2015 and 2016 HTML pages.
    Saves the result to code_map_cache.json so future runs don't re-scrape.
    """
    if not force and os.path.exists(CODE_MAP_CACHE_FILE):
        with open(CODE_MAP_CACHE_FILE, encoding="utf-8") as f:
            code_map = json.load(f)
        log.info(f"Loaded code map from cache ({len(code_map)} entries)")
        return code_map

    log.info("Building course code->name map from 2015/2016 HTML data...")
    code_map: dict[str, str] = {}

    for year in [2015, 2016]:
        config = get_year_config(year)
        links = get_subpage_links(year, config)
        log.info(f"  {year}: {len(links)} sub-pages")

        for fname in tqdm(links, desc=f"  code-map {year}"):
            url = BASE_URL + fname
            html = fetch_html(url)
            time.sleep(REQUEST_DELAY)
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            for t in soup.find_all("table"):
                rows = t.find_all("tr")
                if len(rows) < 3:
                    continue
                for row in rows[1:]:
                    cells = [td.get_text(strip=True) for td in row.find_all("td")]
                    if len(cells) < 3:
                        continue
                    for cs in split_code_name_courses(cells[2]):
                        m = re.match(r"^(\d+)\s*-\s*(.+)$", cs.strip())
                        if m:
                            code_map[m.group(1)] = normalize_course_name(cs)

    log.info(f"  Built code map with {len(code_map)} entries")
    with open(CODE_MAP_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(code_map, f, ensure_ascii=False, indent=2)
    log.info(f"  Saved to {CODE_MAP_CACHE_FILE}")
    return code_map

# ─── Main year scraper ────────────────────────────────────────────────────────

def scrape_year(
    supabase: Client,
    year: int,
    school_cache: dict,
    course_cache: dict,
    code_map: dict[str, str],
    dry_run: bool = False,
) -> None:
    log.info(f"{'='*60}")
    log.info(f"Scraping historical year: {year}")

    config = get_year_config(year)
    links = get_subpage_links(year, config)
    if not links:
        log.warning(f"  No sub-page links found for {year}")
        return

    log.info(f"  Found {len(links)} sub-pages")

    # ── Collect all records ───────────────────────────────────────
    all_records: list[dict] = []
    for fname in tqdm(links, desc=f"  {year} pages"):
        records = parse_subpage(year, fname, code_map)
        all_records.extend(records)

    log.info(f"  Raw records: {len(all_records)}")
    if not all_records:
        return

    if dry_run:
        log.info("  [DRY RUN] Skipping DB writes")
        sample = all_records[:5]
        for r in sample:
            log.info(f"    {r}")
        return

    # ── Bulk-ensure schools and courses ──────────────────────────
    school_names = list({r["school"] for r in all_records if r["school"]})
    course_names = list({r["course"] for r in all_records if r["course"]})
    bulk_ensure_schools(supabase, school_names, school_cache)
    bulk_ensure_courses(supabase, course_names, course_cache)

    # ── Build and insert entries ──────────────────────────────────
    seen: set = set()
    batch: list[dict] = []
    skipped = 0

    for rec in all_records:
        school_id  = school_cache.get(rec["school"])
        course_id  = course_cache.get(rec["course"])
        first_name = rec["first_name"]
        last_name  = rec["last_name"]

        if not school_id or not course_id or not last_name:
            skipped += 1
            continue

        key = (school_id, course_id, year, first_name, last_name)
        if key in seen:
            continue
        seen.add(key)

        batch.append({
            "school_id": school_id,
            "course_id": course_id,
            "year": year,
            "student_first_name": first_name,
            "student_last_name": last_name,
            "is_first_in_course": False,
            "state_rank": None,
            "is_all_rounder": False,
        })

        if len(batch) >= 200:
            supabase.table("honour_roll_entries").upsert(
                batch,
                on_conflict="school_id,course_id,year,student_first_name,student_last_name"
            ).execute()
            batch = []

    if batch:
        supabase.table("honour_roll_entries").upsert(
            batch,
            on_conflict="school_id,course_id,year,student_first_name,student_last_name"
        ).execute()

    log.info(f"  Inserted {len(seen)} entries (skipped {skipped})")

    # ── Recalculate stats ─────────────────────────────────────────
    log.info(f"  Recalculating stats for {year}...")
    school_ids: set = set()
    offset = 0
    while True:
        res = supabase.table("honour_roll_entries").select("school_id").eq("year", year).range(offset, offset + 999).execute()
        if not res.data:
            break
        school_ids.update(r["school_id"] for r in res.data)
        if len(res.data) < 1000:
            break
        offset += 1000

    for sid in school_ids:
        supabase.rpc("recalculate_school_stats", {"p_school_id": sid, "p_year": year}).execute()

    course_ids: set = set()
    offset = 0
    while True:
        res = supabase.table("honour_roll_entries").select("course_id").eq("year", year).range(offset, offset + 999).execute()
        if not res.data:
            break
        course_ids.update(r["course_id"] for r in res.data)
        if len(res.data) < 1000:
            break
        offset += 1000

    for cid in course_ids:
        supabase.rpc("recalculate_course_stats", {"p_course_id": cid, "p_year": year}).execute()

    log.info(f"  Done — {len(school_ids)} schools, {len(course_ids)} courses recalculated")

# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="BandSix Historical NESA Scraper (2001-2016)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--year",      type=int, help="Scrape a single year (2001-2016)")
    group.add_argument("--all-years", action="store_true", help="Scrape all years 2001-2016")
    parser.add_argument("--dry-run",       action="store_true", help="Parse but don't write to DB")
    parser.add_argument("--rebuild-codes", action="store_true", help="Force rebuild the course code cache")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_KEY must be set in scraper/.env")
        sys.exit(1)

    years = HISTORICAL_YEARS if args.all_years else [args.year]
    for y in years:
        if y not in HISTORICAL_YEARS:
            log.error(f"Year {y} not in supported range 2001-2016")
            sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Load DB caches
    school_cache, course_cache = load_cache_from_db(supabase)

    # Build code->name mapping from 2015/2016 (needed for pre-2015 years)
    needs_code_map = any(y not in CODE_NAME_YEARS for y in years)
    code_map: dict[str, str] = {}
    if needs_code_map:
        code_map = build_code_map(force=args.rebuild_codes)

    # Scrape each year (newest first so code_map is populated)
    for year in sorted(years, reverse=True):
        scrape_year(supabase, year, school_cache, course_cache, code_map, dry_run=args.dry_run)

    log.info("All done.")


if __name__ == "__main__":
    main()
