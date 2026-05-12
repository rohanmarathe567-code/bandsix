"""
BandSix NESA Scraper (v2 - Optimized)
======================================
Scrapes NSW HSC Distinguished Achievers and All-round Achievers data
from the NSW Government Elasticsearch API and populates the Supabase database.

New data source (2019-2025):
  https://www.nsw.gov.au/api/v1/elasticsearch/prod_nesa_{year}_hsc_distinguished_achievers/_search

Available years: 2019, 2020, 2022, 2023, 2024, 2025  (2021 has no API index)

Usage:
    python scraper.py [--year YEAR] [--all-years] [--clear]

Requirements:
    pip install -r requirements.txt   (no Playwright needed)
"""

import os
import re
import sys
import json
import time
import argparse
import logging
import urllib.parse
import urllib.request
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from tqdm import tqdm

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("bandsix-scraper")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

ES_BASE = "https://www.nsw.gov.au/api/v1/elasticsearch"
NSW_REFERER = "https://www.nsw.gov.au/education-and-training/nesa/awards-and-events/hsc-merit-lists"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

AVAILABLE_YEARS = [2017, 2019, 2020, 2022, 2023, 2024, 2025]

# ─── Elasticsearch API ────────────────────────────────────────────────────────

def es_search(index: str, query: dict) -> dict:
    url = f"{ES_BASE}/{index}/_search?source_content_type=application%2Fjson&source={urllib.parse.quote(json.dumps(query))}"
    req = urllib.request.Request(url, headers={**HEADERS, "Referer": NSW_REFERER})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def fetch_da_by_prefix(year: int, prefix: str) -> list[dict]:
    """Fetch DA records where school name starts with prefix."""
    index = f"prod_nesa_{year}_hsc_distinguished_achievers"
    must = [{"prefix": {"main_school_name.keyword": prefix}}] if prefix else []
    all_hits = []
    from_ = 0
    size = 1000
    while True:
        query = {
            "from": from_,
            "size": size,
            "query": {"bool": {"must": must, "should": {"match_all": {}}}},
            "sort": [{"_id": "asc"}],  # stable sort prevents skipped records during pagination
        }
        try:
            result = es_search(index, query)
        except Exception as e:
            log.warning(f"    API error prefix '{prefix}' from={from_}: {e}")
            break
        hits = result.get("hits", {}).get("hits", [])
        all_hits.extend(h["_source"] for h in hits)
        if len(hits) < size:
            break
        from_ += size
        if from_ >= 10000:
            log.warning(f"    10k limit hit for prefix '{prefix}' year {year}")
            break
    return all_hits


def fetch_all_da_records(year: int) -> list[dict]:
    log.info(f"  Fetching Distinguished Achievers for {year}...")
    all_records = []
    for prefix in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789":
        records = fetch_da_by_prefix(year, prefix)
        if records:
            all_records.extend(records)
    log.info(f"  Total DA records: {len(all_records)}")
    return all_records


def fetch_all_ar_records(year: int) -> list[dict]:
    index = f"prod_nesa_{year}_hsc_all_round_achievers"
    log.info(f"  Fetching All-round Achievers for {year}...")
    try:
        probe = es_search(index, {"from": 0, "size": 1, "query": {"match_all": {}}})
        total = probe.get("hits", {}).get("total", {}).get("value", 0)
        log.info(f"    Total AR records: {total}")
        all_hits = []
        from_ = 0
        while from_ < min(total, 10000):
            query = {"from": from_, "size": 1000, "query": {"match_all": {}}}
            result = es_search(index, query)
            hits = result.get("hits", {}).get("hits", [])
            all_hits.extend(h["_source"] for h in hits)
            if len(hits) < 1000:
                break
            from_ += 1000
        return all_hits
    except Exception as e:
        log.warning(f"  AR API not available for {year}: {e}")
        return []

# ─── Course/school helpers ────────────────────────────────────────────────────

def normalize_course_name(raw: str) -> str:
    name = re.sub(r"^\d+\s*-\s*", "", raw).strip()
    name = re.sub(r"\s+Examination$", "", name, flags=re.IGNORECASE).strip()
    return name


def slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9\s-]", "", text.lower())
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text[:100]


# Strong Catholic markers - override "high school" in name (e.g. "Corpus Christi Catholic High School")
STRONG_CATHOLIC = [
    "catholic", "marist", "salesian", "lasalle", "la salle", "mercy",
    "dominican", "presentation", "immaculate", "assumption", "xavier",
    "ignatius", "pius", "augustine", "cathedral", "brigidine", "loreto",
    "holy cross", "holy spirit", "holy family", "holy trinity", "holy name",
    "monte sant", "stella maris", "notre dame", "sacred heart",
    "de la salle", "edmund rice", "christian brothers",
]

# Strong independent markers - override "community school" etc. (e.g. "Greenacre Baptist...")
STRONG_INDEPENDENT = [
    "anglican", "lutheran", "adventist", "baptist", "presbyterian",
    "christian school", "christian college", "christian community",
    "islamic", "muslim", "jewish", "hebrew", "steiner", "waldorf",
    "montessori",
]

# Government name patterns - only reached when no strong denomination found
PUBLIC_MARKERS = [
    "high school", " high", "secondary college", "central school",
    "senior college", "community school", "technology school",
    "learning community", "selective campus",
]

# Weak/specific independent markers - checked after public (school names not general terms)
WEAK_INDEPENDENT = [
    "grammar", "scots", "shore school", "barker college", "knox grammar",
    "kambala", "pymble", "ravenswood", "cranbrook", "abbotsleigh", "newington",
    "frensham", "ascham", "meriden",
    "chevalier", "kincoppal", "mercedes",
    "reddam", "riverview",
    "king's school", "the king's", "plc ", "p.l.c",
]

# Weak Catholic markers (saint names) - last resort, after public check so government
# schools named "St George Girls High School" are already handled
WEAK_CATHOLIC = [
    "st ", "saint ", "holy ",
]


def classify_school(name: str) -> str:
    lower = name.lower()
    # 1. Strong religious markers override generic government naming patterns
    for kw in STRONG_CATHOLIC:
        if kw in lower:
            return "catholic"
    for kw in STRONG_INDEPENDENT:
        if kw in lower:
            return "independent"
    # 2. Government schools (no strong denomination found above)
    for marker in PUBLIC_MARKERS:
        if marker in lower:
            return "public"
    # 3. Remaining independent (specific school names)
    for kw in WEAK_INDEPENDENT:
        if kw in lower:
            return "independent"
    # 4. Weak Catholic - "st "/"saint " only fires for schools not already classified
    for kw in WEAK_CATHOLIC:
        if kw in lower:
            return "catholic"
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


def is_extension(name: str) -> bool:
    lower = name.lower()
    return "extension" in lower or "ext " in lower

# ─── Bulk DB helpers ──────────────────────────────────────────────────────────

def load_cache_from_db(supabase: Client) -> tuple[dict, dict]:
    """Load all existing schools and courses into caches."""
    log.info("  Pre-loading school/course caches from DB...")
    school_cache = {}
    course_cache = {}

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

    log.info(f"  Loaded {len(school_cache)} schools, {len(course_cache)} courses from DB")
    return school_cache, course_cache


def bulk_ensure_schools(supabase: Client, names: list[str], cache: dict) -> None:
    """Create any schools not already in cache. Updates cache in-place."""
    missing = [n for n in names if n not in cache]
    if not missing:
        return

    # Get all existing slugs to avoid collisions
    existing_slugs = set()
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

    chunk_size = 50
    for i in range(0, len(to_insert), chunk_size):
        chunk = to_insert[i:i + chunk_size]
        result = supabase.table("schools").insert(chunk).execute()
        for s in (result.data or []):
            cache[s["name"]] = s["id"]

    log.info(f"  Created {len(missing)} new schools")


def bulk_ensure_courses(supabase: Client, names: list[str], cache: dict) -> None:
    """Create any courses not already in cache. Updates cache in-place."""
    missing = [n for n in names if n not in cache]
    if not missing:
        return

    existing_slugs = set()
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
            "is_extension": is_extension(name),
        })

    chunk_size = 50
    for i in range(0, len(to_insert), chunk_size):
        chunk = to_insert[i:i + chunk_size]
        result = supabase.table("courses").insert(chunk).execute()
        for c in (result.data or []):
            cache[c["name"]] = c["id"]

    log.info(f"  Created {len(missing)} new courses")

# ─── Main scraper ─────────────────────────────────────────────────────────────

def scrape_year(supabase: Client, year: int, school_cache: dict, course_cache: dict) -> None:
    log.info(f"{'='*60}")
    log.info(f"Scraping year: {year}")

    if year not in AVAILABLE_YEARS:
        log.warning(f"  Year {year} not on NSW Gov API (available: {AVAILABLE_YEARS})")
        return

    # ── Fetch all records ─────────────────────────────────────────
    da_records = fetch_all_da_records(year)
    if not da_records:
        log.warning(f"  No DA records found for {year}")
        return

    # ── Pre-create all schools and courses in bulk ────────────────
    log.info("  Pre-creating schools and courses in bulk...")
    school_names = list({(rec.get("main_school_name") or "").strip() for rec in da_records if rec.get("main_school_name")})
    raw_courses = list({(rec.get("top_band_courses") or "").strip() for rec in da_records if rec.get("top_band_courses")})
    course_names = list({normalize_course_name(c) for c in raw_courses if normalize_course_name(c)})

    bulk_ensure_schools(supabase, school_names, school_cache)
    bulk_ensure_courses(supabase, course_names, course_cache)

    # ── Build and insert entries ──────────────────────────────────
    log.info(f"  Building {len(da_records)} entries for DB...")
    seen = set()
    batch = []
    skipped = 0

    for rec in da_records:
        school_name = (rec.get("main_school_name") or "").strip()
        raw_course = (rec.get("top_band_courses") or "").strip()
        first_name = (rec.get("first_name") or "").strip()
        last_name = (rec.get("last_name") or "").strip()

        if not school_name or not raw_course or not first_name or not last_name:
            skipped += 1
            continue

        course_name = normalize_course_name(raw_course)
        school_id = school_cache.get(school_name)
        course_id = course_cache.get(course_name)

        if not school_id or not course_id:
            skipped += 1
            continue

        dedup_key = (school_id, course_id, year, first_name, last_name)
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

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

    log.info(f"  Inserted {len(seen)} DA entries (skipped {skipped})")

    # ── All-round Achievers ───────────────────────────────────────
    ar_records = fetch_all_ar_records(year)
    if ar_records:
        log.info(f"  Marking {len(ar_records)} All-round Achievers...")
        ar_school_names = list({(rec.get("main_school_name") or rec.get("school_name") or "").strip()
                                 for rec in ar_records if rec.get("main_school_name") or rec.get("school_name")})
        bulk_ensure_schools(supabase, ar_school_names, school_cache)

        for rec in ar_records:
            school_name = (rec.get("main_school_name") or rec.get("school_name") or "").strip()
            first_name = (rec.get("first_name") or "").strip()
            last_name = (rec.get("last_name") or "").strip()
            school_id = school_cache.get(school_name)
            if not school_id or not first_name or not last_name:
                continue
            supabase.table("honour_roll_entries").update({"is_all_rounder": True}).eq(
                "school_id", school_id
            ).eq("year", year).eq("student_first_name", first_name).eq(
                "student_last_name", last_name
            ).execute()

    # ── Recalculate stats ─────────────────────────────────────────
    log.info(f"  Recalculating stats for {year}...")

    # Paginate to get ALL school_ids (Supabase default limit is 1000 rows)
    school_ids = set()
    offset = 0
    while True:
        res = supabase.table("honour_roll_entries").select("school_id").eq("year", year).range(offset, offset + 999).execute()
        if not res.data:
            break
        school_ids.update(r["school_id"] for r in res.data)
        if len(res.data) < 1000:
            break
        offset += 1000

    for sid in tqdm(list(school_ids), desc=f"  School stats {year}", leave=False):
        supabase.rpc("recalculate_school_stats", {"p_school_id": sid, "p_year": year}).execute()

    course_ids = set()
    offset = 0
    while True:
        res = supabase.table("honour_roll_entries").select("course_id").eq("year", year).range(offset, offset + 999).execute()
        if not res.data:
            break
        course_ids.update(r["course_id"] for r in res.data)
        if len(res.data) < 1000:
            break
        offset += 1000

    for cid in tqdm(list(course_ids), desc=f"  Course stats {year}", leave=False):
        supabase.rpc("recalculate_course_stats", {"p_course_id": cid, "p_year": year}).execute()

    log.info(f"  Done year {year}")


def clear_all_data(supabase: Client) -> None:
    log.info("Clearing all existing data...")
    for table in ["school_yearly_stats", "course_yearly_stats", "honour_roll_entries", "courses", "schools"]:
        supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    log.info("Done.")


def main():
    parser = argparse.ArgumentParser(description="BandSix NESA scraper v2")
    parser.add_argument("--year", type=int)
    parser.add_argument("--all-years", action="store_true")
    parser.add_argument("--start-year", type=int, default=2019)
    parser.add_argument("--end-year", type=int, default=2025)
    parser.add_argument("--clear", action="store_true", help="Clear all data first")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info(f"Connected: {SUPABASE_URL}")

    if args.clear:
        clear_all_data(supabase)

    years = []
    if args.year:
        years = [args.year]
    elif args.all_years:
        years = [y for y in range(args.start_year, args.end_year + 1) if y in AVAILABLE_YEARS]
    else:
        years = [2025]

    log.info(f"Scraping: {years}")

    school_cache, course_cache = load_cache_from_db(supabase)

    for year in years:
        try:
            scrape_year(supabase, year, school_cache, course_cache)
            if year != years[-1]:
                time.sleep(1)
        except Exception as exc:
            log.error(f"Error year {year}: {exc}", exc_info=True)

    log.info("Scraping complete.")


if __name__ == "__main__":
    main()
