"""
Re-classifies every school in the DB using the corrected classify_school logic.
Run once: python fix_school_types.py
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

STRONG_CATHOLIC = [
    "catholic", "marist", "salesian", "lasalle", "la salle", "mercy",
    "dominican", "presentation", "immaculate", "assumption", "xavier",
    "ignatius", "pius", "augustine", "cathedral", "brigidine", "loreto",
    "holy cross", "holy spirit", "holy family", "holy trinity", "holy name",
    "monte sant", "stella maris", "notre dame", "sacred heart",
    "de la salle", "edmund rice", "christian brothers",
]
STRONG_INDEPENDENT = [
    "anglican", "lutheran", "adventist", "baptist", "presbyterian",
    "christian school", "christian college", "christian community",
    "islamic", "muslim", "jewish", "hebrew", "steiner", "waldorf",
    "montessori",
]
PUBLIC_MARKERS = [
    "high school", " high", "secondary college", "central school",
    "senior college", "community school", "technology school",
    "learning community", "selective campus",
]
WEAK_INDEPENDENT = [
    "grammar", "scots", "shore school", "barker college", "knox grammar",
    "kambala", "pymble", "ravenswood", "cranbrook", "abbotsleigh", "newington",
    "frensham", "ascham", "meriden",
    "chevalier", "kincoppal", "mercedes",
    "reddam", "riverview",
    "king's school", "the king's", "plc ", "p.l.c",
]
WEAK_CATHOLIC = ["st ", "saint ", "holy "]


def classify_school(name: str) -> str:
    lower = name.lower()
    for kw in STRONG_CATHOLIC:
        if kw in lower:
            return "catholic"
    for kw in STRONG_INDEPENDENT:
        if kw in lower:
            return "independent"
    for marker in PUBLIC_MARKERS:
        if marker in lower:
            return "public"
    for kw in WEAK_INDEPENDENT:
        if kw in lower:
            return "independent"
    for kw in WEAK_CATHOLIC:
        if kw in lower:
            return "catholic"
    return "other"


def main():
    print("Fetching all schools...")
    all_schools = []
    page_size = 1000
    offset = 0
    while True:
        res = supabase.from_("schools").select("id, name, type").range(offset, offset + page_size - 1).execute()
        batch = res.data or []
        all_schools.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    print(f"Total schools: {len(all_schools)}")

    changes = []
    for school in all_schools:
        new_type = classify_school(school["name"])
        if new_type != school["type"]:
            changes.append((school["id"], school["name"], school["type"], new_type))

    print(f"Schools that will be reclassified: {len(changes)}")
    for sid, name, old, new in sorted(changes, key=lambda x: (x[2], x[3], x[1])):
        print(f"  [{old} -> {new}] {name}")

    if not changes:
        print("Nothing to change.")
        return

    confirm = input(f"\nApply {len(changes)} changes? [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        return

    for sid, name, old, new in changes:
        supabase.from_("schools").update({"type": new}).eq("id", sid).execute()
        print(f"  Updated: {name}")

    print(f"\nDone. Updated {len(changes)} schools.")


if __name__ == "__main__":
    main()
