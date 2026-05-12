"""Test pagination and total counts for the NSW Gov Elasticsearch API."""
import json
import urllib.parse
import urllib.request

BASE_API = "https://www.nsw.gov.au/api/v1/elasticsearch"

def fetch(year, from_=0, size=10, school_prefix=None, track_total=True):
    index = f"prod_nesa_{year}_hsc_distinguished_achievers"
    must = []
    if school_prefix:
        must.append({"prefix": {"main_school_name.keyword": school_prefix}})
    query = {
        "from": from_,
        "size": size,
        "track_total_hits": track_total,
        "query": {"bool": {"must": must, "should": {"match_all": {}}}},
    }
    url = f"{BASE_API}/{index}/_search?source_content_type=application%2Fjson&source={urllib.parse.quote(json.dumps(query))}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 Chrome/124.0.0.0",
        "Accept": "application/json",
        "Referer": f"https://www.nsw.gov.au/education-and-training/nesa/awards-and-events/hsc-merit-lists/distinguished-achievers/{year}"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

# Check actual total count for 2025 with track_total_hits: true
print("=== 2025 total count (track_total_hits=true) ===")
r = fetch(2025, size=1, track_total=True)
total = r["hits"]["total"]
print(f"Total: {total}")  # shows value and relation

# Test letter-based pagination — how many schools start with 'A'?
print("\n=== Schools starting with 'A' in 2025 ===")
r_a = fetch(2025, size=5, school_prefix="A")
print(f"Total for 'A': {r_a['hits']['total']}")
for h in r_a["hits"]["hits"]:
    s = h["_source"]
    print(f"  {s['main_school_name']} | {s['last_name']}, {s['first_name']} | {s['top_band_courses']}")

# What's the max possible from+size?
print("\n=== Test from=9990, size=10 (near limit) ===")
try:
    r_near = fetch(2025, from_=9990, size=10)
    print(f"OK - got {len(r_near['hits']['hits'])} records")
except Exception as e:
    print(f"Error: {e}")

# Try from=9999, size=1
print("\n=== Test from=9999, size=1 ===")
try:
    r_end = fetch(2025, from_=9999, size=1)
    print(f"OK - got {len(r_end['hits']['hits'])} records")
except Exception as e:
    print(f"Error: {e}")

# Try from=10000
print("\n=== Test from=10000 (over limit) ===")
try:
    r_over = fetch(2025, from_=10000, size=10)
    print(f"Got {len(r_over['hits']['hits'])} records")
    if "error" in r_over:
        print(f"Error in response: {r_over['error']}")
except Exception as e:
    print(f"Exception: {e}")

# Check year range - which years exist?
print("\n=== Year availability ===")
for year in range(2018, 2026):
    try:
        r = fetch(year, size=1)
        total = r["hits"]["total"]["value"]
        print(f"  {year}: {total} records")
    except Exception as e:
        print(f"  {year}: ERROR - {e}")
