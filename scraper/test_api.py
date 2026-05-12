"""Test the NSW Gov Elasticsearch API for Distinguished Achievers."""
import json
import urllib.parse
import urllib.request

BASE_API = "https://www.nsw.gov.au/api/v1/elasticsearch"

def fetch_distinguished(year: int, from_: int = 0, size: int = 10):
    index = f"prod_nesa_{year}_hsc_distinguished_achievers"
    query = {
        "from": from_,
        "size": size,
        "query": {"bool": {"must": [], "should": {"match_all": {}}}},
        "sort": [
            {"_script": {"type": "string", "script": {"lang": "painless",
                "source": "/<[^>]*>/.matcher(doc['last_name.keyword'].value).replaceAll('').toLowerCase()"},
                "order": "asc"}},
        ]
    }
    url = f"{BASE_API}/{index}/_search?source_content_type=application%2Fjson&source={urllib.parse.quote(json.dumps(query))}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": f"https://www.nsw.gov.au/education-and-training/nesa/awards-and-events/hsc-merit-lists/distinguished-achievers/{year}"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

# Fetch a small sample for 2025
print("=== 2025 API sample (10 records) ===")
result = fetch_distinguished(2025, 0, 5)
if "error" in result:
    print(f"Error: {result['error']}")
else:
    total = result.get("hits", {}).get("total", {}).get("value", "?")
    print(f"Total records: {total}")
    hits = result.get("hits", {}).get("hits", [])
    print(f"Sample records:")
    for hit in hits:
        src = hit.get("_source", {})
        print(f"  {json.dumps(src, indent=4)}")
        print()

# Check if 2024 index exists
print("\n=== 2024 API sample ===")
result24 = fetch_distinguished(2024, 0, 3)
if "error" in result24:
    print(f"Error: {result24['error']}")
else:
    total24 = result24.get("hits", {}).get("total", {}).get("value", "?")
    print(f"Total: {total24}")
    hits24 = result24.get("hits", {}).get("hits", [])
    if hits24:
        print(f"Fields: {list(hits24[0].get('_source', {}).keys())}")

# Check 2019 (earliest on new site)
print("\n=== 2019 API sample ===")
result19 = fetch_distinguished(2019, 0, 3)
if "error" in result19:
    print(f"Error: {result19['error']}")
else:
    total19 = result19.get("hits", {}).get("total", {}).get("value", "?")
    print(f"Total: {total19}")

# Check 2018 (might not exist on new site)
print("\n=== 2018 API (may not exist) ===")
result18 = fetch_distinguished(2018, 0, 3)
if "error" in result18:
    print(f"Error: {result18['error']}")
else:
    total18 = result18.get("hits", {}).get("total", {}).get("value", "?")
    print(f"Total: {total18}")
