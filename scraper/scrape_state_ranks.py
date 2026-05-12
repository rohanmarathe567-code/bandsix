"""
Scrape Top Achievers in Course (state ranks) from NSW Gov API
and update honour_roll_entries with state_rank and is_first_in_course.

Available years: 2022, 2023, 2025 (others return 404)

Usage:
    python scrape_state_ranks.py
    python scrape_state_ranks.py --year 2025
"""

import os, sys, json, time, argparse, logging, urllib.parse, urllib.request
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    handlers=[logging.StreamHandler(sys.stdout)])
log = logging.getLogger("state-ranks")

supabase = create_client(os.getenv("SUPABASE_URL",""), os.getenv("SUPABASE_KEY",""))

ES_BASE = "https://www.nsw.gov.au/api/v1/elasticsearch"
REFERER = "https://www.nsw.gov.au/education-and-training/nesa/awards-and-events/hsc-merit-lists/top-achievers-course"
HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/124", "Accept": "application/json", "Referer": REFERER}
AVAILABLE_YEARS = [2022, 2023, 2025]


def es_fetch(index, query):
    url = f"{ES_BASE}/{index}/_search?source_content_type=application%2Fjson&source={urllib.parse.quote(json.dumps(query))}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def fetch_all_top_achievers(year):
    index = f"prod_nesa_{year}_hsc_top_achievers_in_course"
    all_hits = []
    from_ = 0
    while True:
        query = {"from": from_, "size": 1000, "query": {"match_all": {}}, "sort": [{"_id": "asc"}]}
        try:
            result = es_fetch(index, query)
        except Exception as e:
            log.warning(f"  API error from={from_}: {e}")
            break
        hits = result.get("hits", {}).get("hits", [])
        all_hits.extend(h["_source"] for h in hits)
        if len(hits) < 1000:
            break
        from_ += 1000
    return all_hits


def build_school_cache():
    cache = {}
    offset = 0
    while True:
        res = supabase.table("schools").select("id, name").range(offset, offset+999).execute()
        for r in (res.data or []):
            cache[r["name"]] = r["id"]
        if len(res.data or []) < 1000:
            break
        offset += 1000
    return cache


def build_course_cache():
    cache = {}
    offset = 0
    while True:
        res = supabase.table("courses").select("id, name").range(offset, offset+999).execute()
        for r in (res.data or []):
            cache[r["name"]] = r["id"]
        if len(res.data or []) < 1000:
            break
        offset += 1000
    return cache


def rpc_retry(fn, args, retries=3):
    for attempt in range(retries):
        try:
            supabase.rpc(fn, args).execute()
            return
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                log.warning(f"  RPC failed: {fn} — {e}")


def process_year(year, school_cache, course_cache):
    log.info(f"{'='*60}")
    log.info(f"Processing state ranks for {year}...")

    records = fetch_all_top_achievers(year)
    log.info(f"  Fetched {len(records)} top achiever records")

    updated = 0
    not_found = 0
    affected_schools = set()
    affected_courses = set()

    for rec in records:
        school_name = (rec.get("school_name") or "").strip()
        course_name = (rec.get("course_name") or "").strip()
        first_name  = (rec.get("first_name") or "").strip()
        last_name   = (rec.get("last_name") or "").strip()
        place       = rec.get("place") or rec.get("sort_place")

        if not all([school_name, course_name, first_name, last_name, place]):
            continue

        place = int(place)
        is_first = (place == 1)

        school_id = school_cache.get(school_name)
        course_id = course_cache.get(course_name)

        if not school_id:
            # Try case-insensitive match
            for name, sid in school_cache.items():
                if name.lower() == school_name.lower():
                    school_id = sid
                    break

        if not course_id:
            # Try case-insensitive match
            for name, cid in course_cache.items():
                if name.lower() == course_name.lower():
                    course_id = cid
                    break

        if not school_id or not course_id:
            log.debug(f"  Not found: {school_name} / {course_name}")
            not_found += 1
            continue

        # Update the matching honour_roll_entry
        res = supabase.table("honour_roll_entries").update({
            "state_rank": place,
            "is_first_in_course": is_first,
        }).eq("school_id", school_id).eq("course_id", course_id).eq("year", year)\
          .eq("student_first_name", first_name).eq("student_last_name", last_name).execute()

        if res.data:
            updated += 1
            affected_schools.add(school_id)
            affected_courses.add(course_id)
        else:
            # Entry might be missing from honour_roll_entries — insert it
            try:
                supabase.table("honour_roll_entries").upsert({
                    "school_id": school_id, "course_id": course_id, "year": year,
                    "student_first_name": first_name, "student_last_name": last_name,
                    "state_rank": place, "is_first_in_course": is_first, "is_all_rounder": False,
                }, on_conflict="school_id,course_id,year,student_first_name,student_last_name").execute()
                updated += 1
                affected_schools.add(school_id)
                affected_courses.add(course_id)
            except Exception as e:
                log.warning(f"  Insert failed: {first_name} {last_name} / {course_name}: {e}")
                not_found += 1

        time.sleep(0.02)

    log.info(f"  Updated {updated} entries, {not_found} not found")

    # Recalculate stats for affected schools/courses
    log.info(f"  Recalculating stats for {len(affected_schools)} schools, {len(affected_courses)} courses...")
    for sid in affected_schools:
        rpc_retry("recalculate_school_stats", {"p_school_id": sid, "p_year": year})
        time.sleep(0.05)
    for cid in affected_courses:
        rpc_retry("recalculate_course_stats", {"p_course_id": cid, "p_year": year})
        time.sleep(0.05)

    log.info(f"  Done year {year}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int)
    args = parser.parse_args()

    log.info("Building caches...")
    school_cache = build_school_cache()
    course_cache = build_course_cache()
    log.info(f"  {len(school_cache)} schools, {len(course_cache)} courses loaded")

    years = [args.year] if args.year else AVAILABLE_YEARS
    for year in years:
        if year not in AVAILABLE_YEARS:
            log.warning(f"Year {year} not available (available: {AVAILABLE_YEARS})")
            continue
        process_year(year, school_cache, course_cache)

    log.info("State ranks complete.")


if __name__ == "__main__":
    main()
