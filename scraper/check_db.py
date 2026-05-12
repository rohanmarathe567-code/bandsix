"""Quick database diagnostic script."""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_KEY", ""))

# Check honour_roll_entries counts by year
print("=== honour_roll_entries by year ===")
result = supabase.table("honour_roll_entries").select("year").execute()
year_counts = {}
for r in (result.data or []):
    year_counts[r["year"]] = year_counts.get(r["year"], 0) + 1
for y in sorted(year_counts):
    print(f"  {y}: {year_counts[y]} entries")

# Check school_yearly_stats counts by year
print("\n=== school_yearly_stats by year ===")
result2 = supabase.table("school_yearly_stats").select("year, total_b6, school_id").execute()
sys_data = result2.data or []
sys_by_year = {}
for r in sys_data:
    sys_by_year[r["year"]] = sys_by_year.get(r["year"], 0) + 1
for y in sorted(sys_by_year):
    print(f"  {y}: {sys_by_year[y]} schools")

# Sample a few rows from school_yearly_stats
print("\n=== Sample school_yearly_stats rows ===")
sample = supabase.table("school_yearly_stats").select("school_id, year, total_b6").order("total_b6", desc=True).limit(5).execute()
for r in (sample.data or []):
    print(f"  school={r['school_id'][:8]}... year={r['year']} total_b6={r['total_b6']}")

# Check schools table
print(f"\n=== Schools ({len(supabase.table('schools').select('id, name').execute().data or [])} total) ===")
schools = supabase.table("schools").select("id, name").execute().data or []
for s in schools[:10]:
    print(f"  {s['name']}")

print("\nDone.")
