"""
Recalculate school_yearly_stats and course_yearly_stats for all years.
Paginates properly to handle large tables (Supabase default limit = 1000 rows).
"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client
from tqdm import tqdm

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_KEY", ""))
print(f"Connected: {os.getenv('SUPABASE_URL')}")

def get_all_ids(table, field, year):
    ids = set()
    offset = 0
    while True:
        res = supabase.table(table).select(field).eq("year", year).range(offset, offset + 999).execute()
        if not res.data:
            break
        ids.update(r[field] for r in res.data)
        if len(res.data) < 1000:
            break
        offset += 1000
    return list(ids)

# Get all years that have data
print("Finding all years with data...")
years_set = set()
offset = 0
while True:
    res = supabase.table("honour_roll_entries").select("year").range(offset, offset + 999).execute()
    if not res.data:
        break
    years_set.update(r["year"] for r in res.data)
    if len(res.data) < 1000:
        break
    offset += 1000

years = sorted(years_set)
print(f"Years with data: {years}")

import time

def rpc_with_retry(fn, args, retries=5):
    for attempt in range(retries):
        try:
            supabase.rpc(fn, args).execute()
            return
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # exponential backoff
            else:
                print(f"  FAILED after {retries} attempts: {fn}({args}) — {e}")

for year in years:
    print(f"\n--- Year {year} ---")
    school_ids = get_all_ids("honour_roll_entries", "school_id", year)
    print(f"  {len(school_ids)} schools")
    for sid in tqdm(school_ids, desc=f"  School stats {year}"):
        rpc_with_retry("recalculate_school_stats", {"p_school_id": sid, "p_year": year})
        time.sleep(0.05)  # 50ms pause to avoid overwhelming Supabase

    course_ids = get_all_ids("honour_roll_entries", "course_id", year)
    print(f"  {len(course_ids)} courses")
    for cid in tqdm(course_ids, desc=f"  Course stats {year}"):
        rpc_with_retry("recalculate_course_stats", {"p_course_id": cid, "p_year": year})
        time.sleep(0.05)

    print(f"  Done year {year}")

print("\nAll stats recalculated.")
