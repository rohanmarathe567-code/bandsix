"""Check specific school entry counts to identify discrepancies."""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_KEY", ""))

def get_school_id(name):
    r = supabase.table("schools").select("id").eq("name", name).execute()
    return r.data[0]["id"] if r.data else None

def count_entries(school_id, year):
    offset, total = 0, []
    while True:
        r = supabase.table("honour_roll_entries").select("id, course_id, student_first_name, student_last_name").eq("school_id", school_id).eq("year", year).range(offset, offset+999).execute()
        if not r.data: break
        total.extend(r.data)
        if len(r.data) < 1000: break
        offset += 1000
    return total

schools_to_check = [
    ("Sydney Grammar School", 763),
    ("Knox Grammar School", 724),
    ("James Ruse Agricultural High School", 705),
    ("North Sydney Boys High School", 664),
    ("Sydney Boys High School", 651),
    ("Pymble Ladies' College", 644),
    ("Baulkham Hills High School", 623),
    ("North Sydney Girls High School", 549),
    ("Barker College", 540),
    ("Abbotsleigh", 495),
]

print(f"{'School':<45} {'Our B6':>8} {'HSCninja':>9} {'Diff':>6}")
print("-" * 72)
for name, expected in schools_to_check:
    sid = get_school_id(name)
    if sid:
        entries = count_entries(sid, 2025)
        count = len(entries)
        diff = count - expected
        flag = " <-- WRONG" if diff != 0 else ""
        print(f"{name:<45} {count:>8} {expected:>9} {diff:>+6}{flag}")
    else:
        print(f"{name:<45} {'NOT IN DB':>8}")
