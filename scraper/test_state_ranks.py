"""Sample the Top Achievers in Course API."""
import json, urllib.parse, urllib.request

BASE = "https://www.nsw.gov.au/api/v1/elasticsearch"
REFERER = "https://www.nsw.gov.au/education-and-training/nesa/awards-and-events/hsc-merit-lists/top-achievers-course"
HEADERS = {
    "User-Agent": "Mozilla/5.0 Chrome/124",
    "Accept": "application/json",
    "Referer": REFERER,
}

def fetch(year, size=5):
    index = f"prod_nesa_{year}_hsc_top_achievers_in_course"
    query = {"from": 0, "size": size, "query": {"match_all": {}}, "sort": [{"_id": "asc"}]}
    url = f"{BASE}/{index}/_search?source_content_type=application%2Fjson&source={urllib.parse.quote(json.dumps(query))}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# Sample 2025
print("=== 2025 Top Achievers sample ===")
r = fetch(2025, 10)
total = r["hits"]["total"]["value"]
print(f"Total: {total}")
for h in r["hits"]["hits"]:
    src = h["_source"]
    print(f"  Fields: {list(src.keys())}")
    print(f"  {json.dumps(src)}")
    break  # just show fields once

print("\nAll sample records:")
for h in r["hits"]["hits"]:
    s = h["_source"]
    print(f"  {s.get('place','?'):>3}  {s.get('course_name','?'):<40} {s.get('first_name','')} {s.get('last_name','')} — {s.get('school_name','')}")

# Check which years exist
print("\n=== Year availability ===")
for year in [2019, 2020, 2021, 2022, 2023, 2024, 2025]:
    try:
        r2 = fetch(year, 1)
        print(f"  {year}: {r2['hits']['total']['value']} records")
    except Exception as e:
        print(f"  {year}: ERROR — {e}")
