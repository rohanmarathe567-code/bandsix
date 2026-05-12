"""
Check if the API returns duplicate course entries (with/without 'Examination' suffix)
for the same student, and if our normalization is incorrectly deduplicating them.
"""
import json, urllib.parse, urllib.request, re, os
from dotenv import load_dotenv
from supabase import create_client
from collections import Counter

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL",""), os.getenv("SUPABASE_KEY",""))

BASE_API = "https://www.nsw.gov.au/api/v1/elasticsearch"

def normalize_course_name(raw):
    name = re.sub(r"^\d+\s*-\s*", "", raw).strip()
    name = re.sub(r"\s+Examination$", "", name, flags=re.IGNORECASE).strip()
    return name

def fetch_school(year, school_name):
    index = f"prod_nesa_{year}_hsc_distinguished_achievers"
    must = [{"term": {"main_school_name.keyword": school_name}}]
    query = {"from": 0, "size": 1000, "query": {"bool": {"must": must}}}
    url = f"{BASE_API}/{index}/_search?source_content_type=application%2Fjson&source={urllib.parse.quote(json.dumps(query))}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 Chrome/124",
        "Accept": "application/json",
        "Referer": "https://www.nsw.gov.au/"
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    return [h["_source"] for h in data.get("hits", {}).get("hits", [])]

# Check Sydney Grammar - 763 expected, 734 in DB → 29 missing
school = "Sydney Grammar School"
print(f"=== {school} ===")
records = fetch_school(2025, school)
print(f"Raw API records: {len(records)}")

# Check for raw course names before normalization
raw_courses = Counter(r["top_band_courses"] for r in records)
normalized_courses = Counter(normalize_course_name(r["top_band_courses"]) for r in records)
print(f"Unique raw course names: {len(raw_courses)}")
print(f"Unique normalized course names: {len(normalized_courses)}")

# Find cases where different raw names normalize to same thing
from collections import defaultdict
raw_to_norm = defaultdict(set)
for raw in raw_courses:
    norm = normalize_course_name(raw)
    raw_to_norm[norm].add(raw)

collisions = {norm: raws for norm, raws in raw_to_norm.items() if len(raws) > 1}
if collisions:
    print(f"\nCourse name collisions (same normalized name, diff raw names): {len(collisions)}")
    for norm, raws in list(collisions.items())[:10]:
        print(f"  '{norm}' <- {raws}")

# Check for duplicate (student, normalized_course) entries
student_course_pairs = Counter(
    (r["first_name"], r["last_name"], normalize_course_name(r["top_band_courses"]))
    for r in records
)
dupes = {k: v for k, v in student_course_pairs.items() if v > 1}
print(f"\nDuplicate (student, normalized_course) pairs: {len(dupes)}")
for k, v in list(dupes.items())[:5]:
    print(f"  {k[0]} {k[1]} - {k[2]}: {v}x")

# Check raw vs normalized counts
raw_pairs = Counter((r["first_name"], r["last_name"], r["top_band_courses"]) for r in records)
norm_pairs = Counter((r["first_name"], r["last_name"], normalize_course_name(r["top_band_courses"])) for r in records)
print(f"\nUnique raw (student,course) pairs: {len(raw_pairs)}")
print(f"Unique normalized (student,course) pairs: {len(norm_pairs)}")
print(f"Lost to normalization: {len(raw_pairs) - len(norm_pairs)}")
