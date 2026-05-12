"""
BandSix CSV Updater — State Ranks + All-round Achievers (bulk mode)
====================================================================
Downloads official NESA CSVs and bulk-updates honour_roll_entries with:
  - state_rank + is_first_in_course  (Top Achievers in Course CSVs)
  - is_all_rounder                   (All-round Achievers CSVs)

Strategy: load all entries for a year into memory, patch in-memory,
then upsert only changed rows — far fewer API calls than per-record updates.

Usage:
    python update_from_csvs.py              # all years
    python update_from_csvs.py --year 2024  # single year
"""

import os, sys, io, csv, time, argparse, logging, urllib.request
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("csv-updater")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

NSW_BASE = "https://www.nsw.gov.au"
HEADERS  = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

TOP_ACHIEVERS_URLS = {
    2017: "/sites/default/files/noindex/2025-11/2017-hsc-top-achievers-in-course.csv",
    2019: "/sites/default/files/2025-11/2019-hsc-top-achievers-in-course.csv",
    2020: "/sites/default/files/2025-11/2020-hsc-top-achievers-in-course.csv",
    2021: "/sites/default/files/2025-11/2021-hsc-top-achievers-in-course.csv",
    2022: "/sites/default/files/2025-11/2022-hsc-top-achievers-in-course.csv",
    2023: "/sites/default/files/2025-11/2023-hsc-top-achievers-in-course.csv",
    2024: "/sites/default/files/noindex/2026-02/2024-hsc-top-achievers-in-course.CSV",
    2025: "/sites/default/files/noindex/2026-02/2025-hsc-top-achievers-in-course.CSV",
}

ALL_ROUNDERS_URLS = {
    2017: "/sites/default/files/noindex/2025-11/2017-hsc-all-round-achievers.csv",
    2019: "/sites/default/files/2025-11/2019-hsc-all-round-achievers.csv",
    2020: "/sites/default/files/2025-11/2020-hsc-all-round-achievers.csv",
    2021: "/sites/default/files/2025-11/2021-hsc-all-round-achievers.csv",
    2022: "/sites/default/files/2025-11/2022-hsc-all-round-achievers.csv",
    2023: "/sites/default/files/2025-11/2023-hsc-all-round-achievers.csv",
    2024: "/sites/default/files/noindex/2026-02/2024-hsc-all-round-achievers.CSV",
    2025: "/sites/default/files/noindex/2026-02/2025-hsc-all-round-achievers.CSV",
}

AVAILABLE_YEARS = sorted(TOP_ACHIEVERS_URLS.keys())
UPSERT_CHUNK   = 200


def fetch_csv(path: str) -> list[dict]:
    """Download CSV and normalize column names to lowercase with underscores."""
    url = NSW_BASE + path
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        content = r.read().decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    return [{k.lower().replace(" ", "_"): (v or "").strip() for k, v in row.items()} for row in rows]


def load_caches(supabase: Client) -> tuple[dict, dict]:
    school_cache: dict = {}
    course_cache: dict = {}
    offset = 0
    while True:
        res = supabase.table("schools").select("id, name").range(offset, offset + 999).execute()
        for r in (res.data or []):
            school_cache[r["name"].lower()] = r["id"]
        if len(res.data or []) < 1000:
            break
        offset += 1000
    offset = 0
    while True:
        res = supabase.table("courses").select("id, name").range(offset, offset + 999).execute()
        for r in (res.data or []):
            course_cache[r["name"].lower()] = r["id"]
        if len(res.data or []) < 1000:
            break
        offset += 1000
    return school_cache, course_cache


def load_year_entries(supabase: Client, year: int) -> list[dict]:
    """Load all honour_roll_entries for a year into memory."""
    all_rows: list[dict] = []
    offset = 0
    while True:
        res = supabase.table("honour_roll_entries")\
            .select("id, school_id, course_id, student_first_name, student_last_name, state_rank, is_first_in_course, is_all_rounder")\
            .eq("year", year).range(offset, offset + 999).execute()
        rows = res.data or []
        all_rows.extend(rows)
        if len(rows) < 1000:
            break
        offset += 1000
    return all_rows


def bulk_upsert(supabase: Client, rows: list[dict], year: int) -> None:
    """Upsert rows in chunks. Existing rows (with id) and new rows (without id) are sent separately."""
    existing = [r for r in rows if "id" in r]
    new_rows  = [r for r in rows if "id" not in r]

    for batch in [existing, new_rows]:
        for i in range(0, len(batch), UPSERT_CHUNK):
            chunk = batch[i:i + UPSERT_CHUNK]
            for r in chunk:
                r["year"] = year
            supabase.table("honour_roll_entries").upsert(
                chunk,
                on_conflict="school_id,course_id,year,student_first_name,student_last_name"
            ).execute()


def recalc_stats(supabase: Client, year: int, school_ids: set, course_ids: set) -> None:
    log.info(f"  Recalculating {len(school_ids)} schools, {len(course_ids)} courses...")
    for sid in school_ids:
        supabase.rpc("recalculate_school_stats", {"p_school_id": sid, "p_year": year}).execute()
    for cid in course_ids:
        supabase.rpc("recalculate_course_stats", {"p_course_id": cid, "p_year": year}).execute()


def process_year(supabase: Client, year: int, school_cache: dict, course_cache: dict) -> None:
    log.info(f"{'='*60}")
    log.info(f"Processing year: {year}")

    # ── Load all existing entries into memory ─────────────────────
    log.info(f"  Loading all entries for {year}...")
    entries = load_year_entries(supabase, year)
    log.info(f"  {len(entries)} existing entries")

    # Build fast lookup: (school_id, course_id, first, last) → entry dict
    by_key: dict = {}
    for e in entries:
        key = (e["school_id"], e["course_id"],
               e["student_first_name"], e["student_last_name"])
        by_key[key] = e

    # Also build (school_id, first, last) → list[entry] for all-rounders
    by_student: dict = {}
    for e in entries:
        key = (e["school_id"], e["student_first_name"], e["student_last_name"])
        by_student.setdefault(key, []).append(e)

    changed: set = set()  # entry ids that were modified

    # ── Apply state ranks ─────────────────────────────────────────
    ta_path = TOP_ACHIEVERS_URLS.get(year)
    if ta_path:
        log.info(f"  Downloading top achievers CSV...")
        try:
            ta_rows = fetch_csv(ta_path)
            log.info(f"  {len(ta_rows)} state rank records")
            not_found = 0
            for rec in ta_rows:
                course_name = rec.get("course_name", "")
                first_name  = rec.get("first_name", "")
                last_name   = rec.get("last_name", "")
                school_name = rec.get("school_name", "")
                place_str   = rec.get("place", "")
                if not all([course_name, first_name, last_name, school_name, place_str]):
                    continue
                try:
                    place = int(place_str)
                except ValueError:
                    continue

                school_id = school_cache.get(school_name.lower())
                course_id = course_cache.get(course_name.lower())
                if not school_id or not course_id:
                    not_found += 1
                    continue

                key = (school_id, course_id, first_name, last_name)
                if key in by_key:
                    e = by_key[key]
                    e["state_rank"]       = place
                    e["is_first_in_course"] = (place == 1)
                    changed.add(e["id"])
                else:
                    # Missing from DA list — create new entry
                    new_entry = {
                        "school_id": school_id, "course_id": course_id, "year": year,
                        "student_first_name": first_name, "student_last_name": last_name,
                        "state_rank": place, "is_first_in_course": (place == 1),
                        "is_all_rounder": False,
                    }
                    entries.append(new_entry)
                    by_key[key] = new_entry
                    by_student.setdefault((school_id, first_name, last_name), []).append(new_entry)

            log.info(f"  State ranks applied ({not_found} not matched)")
        except Exception as e:
            log.error(f"  Top achievers CSV failed: {e}")

    # ── Apply all-rounders ────────────────────────────────────────
    ar_path = ALL_ROUNDERS_URLS.get(year)
    if ar_path:
        log.info(f"  Downloading all-rounders CSV...")
        try:
            ar_rows = fetch_csv(ar_path)
            log.info(f"  {len(ar_rows)} all-rounder records")
            not_found = 0
            for rec in ar_rows:
                first_name  = rec.get("first_name", "")
                last_name   = rec.get("last_name", "")
                school_name = rec.get("main_school_name", "")
                if not all([first_name, last_name, school_name]):
                    continue
                school_id = school_cache.get(school_name.lower())
                if not school_id:
                    not_found += 1
                    continue
                student_entries = by_student.get((school_id, first_name, last_name), [])
                if not student_entries:
                    not_found += 1
                    continue
                for e in student_entries:
                    e["is_all_rounder"] = True
                    if "id" in e:
                        changed.add(e["id"])
            log.info(f"  All-rounders applied ({not_found} not matched)")
        except Exception as e:
            log.error(f"  All-rounders CSV failed: {e}")

    if not changed and not any("id" not in e for e in entries):
        log.info("  Nothing to update")
        return

    # ── Bulk upsert all changed + new entries ─────────────────────
    to_upsert = [e for e in entries if e.get("id") in changed or "id" not in e]
    log.info(f"  Upserting {len(to_upsert)} changed/new entries...")

    affected_schools: set = set()
    affected_courses: set = set()

    # Strip 'id' from new entries before upsert, keep for existing
    upsert_rows = []
    for e in to_upsert:
        row = {
            "school_id": e["school_id"], "course_id": e["course_id"],
            "student_first_name": e["student_first_name"],
            "student_last_name": e["student_last_name"],
            "state_rank": e.get("state_rank"), "is_first_in_course": e.get("is_first_in_course", False),
            "is_all_rounder": e.get("is_all_rounder", False),
        }
        if "id" in e:
            row["id"] = e["id"]
        upsert_rows.append(row)
        affected_schools.add(e["school_id"])
        affected_courses.add(e["course_id"])

    bulk_upsert(supabase, upsert_rows, year)
    log.info(f"  Upsert complete")

    recalc_stats(supabase, year, affected_schools, affected_courses)
    log.info(f"  Done: {year}")


def main():
    parser = argparse.ArgumentParser(description="Update state ranks and all-rounders from NESA CSV files")
    parser.add_argument("--year", type=int, help=f"Single year (available: {AVAILABLE_YEARS})")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_KEY must be set in scraper/.env")
        sys.exit(1)

    years = [args.year] if args.year else AVAILABLE_YEARS
    for y in years:
        if y not in AVAILABLE_YEARS:
            log.error(f"Year {y} not available. Choose from: {AVAILABLE_YEARS}")
            sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    log.info("Loading DB caches...")
    school_cache, course_cache = load_caches(supabase)
    log.info(f"  {len(school_cache)} schools, {len(course_cache)} courses")

    for year in years:
        process_year(supabase, year, school_cache, course_cache)

    log.info("All done.")


if __name__ == "__main__":
    main()
