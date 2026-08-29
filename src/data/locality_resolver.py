"""Shared Bengaluru locality extraction from user text."""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import List, Optional

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
_LOCALITIES_JSONL = os.path.join(_ROOT, "Docs/localities.jsonl")
_LISTINGS_JSON = os.path.join(_ROOT, "data/listings.json")

LOCALITY_ALIASES = {
    "cantonment": "Cantonment Area",
    "cantonment area": "Cantonment Area",
    "hsr": "HSR Layout",
    "hsr layout": "HSR Layout",
    "jp nagar": "J. P. Nagar",
    "j p nagar": "J. P. Nagar",
    "jpnagar": "J. P. Nagar",
    "rt nagar": "R. T. Nagar",
    "r t nagar": "R. T. Nagar",
    "ulsoor": "Ulsoor / Halasuru",
    "halasuru": "Ulsoor / Halasuru",
    "koramangala": "Koramangala",
    "kormangala": "Koramangala",
    "indiranagar": "Indiranagar",
    "indira nagar": "Indiranagar",
    "white field": "Whitefield",
    "electronic city": "Electronic City",
    "ecity": "Electronic City",
    "marathahalli": "Marathahalli",
    "marathalli": "Marathahalli",
    "sarjapur": "Sarjapur Road",
    "sarjapur road": "Sarjapur Road",
}


@lru_cache(maxsize=1)
def get_canonical_localities() -> tuple[str, ...]:
    localities: set[str] = set()
    if os.path.exists(_LOCALITIES_JSONL):
        with open(_LOCALITIES_JSONL, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                localities.add(json.loads(line)["locality"])
    if os.path.exists(_LISTINGS_JSON):
        with open(_LISTINGS_JSON, "r", encoding="utf-8") as handle:
            for item in json.load(handle):
                locality = item.get("locality")
                if locality:
                    localities.add(locality)
    return tuple(sorted(localities))


def extract_localities_from_text(text: str) -> List[str]:
    if not text:
        return []
    query = text.lower()
    matched: set[str] = set()

    for alias, canonical in LOCALITY_ALIASES.items():
        if alias in query:
            matched.add(canonical)

    for locality in sorted(get_canonical_localities(), key=len, reverse=True):
        loc_lower = locality.lower()
        parts = [part.strip() for part in loc_lower.split("/") if part.strip()]
        if loc_lower in query or any(part in query for part in parts):
            matched.add(locality)

    return list(matched)


def extract_locality_from_text(text: str) -> Optional[str]:
    localities = extract_localities_from_text(text)
    if not localities:
        return None

    text_lower = text.lower()
    pivot_markers = ("instead", "switch to", "show me", "forget", "rather than", "change to", "make that")
    best_idx = -1
    best_loc = localities[-1]
    for marker in pivot_markers:
        idx = text_lower.rfind(marker)
        if idx >= best_idx:
            segment = text_lower[idx:]
            for locality in localities:
                loc_lower = locality.lower()
                parts = [part.strip() for part in loc_lower.split("/") if part.strip()]
                if loc_lower in segment or any(part in segment for part in parts):
                    best_loc = locality
                    best_idx = idx
                    break
    return best_loc


def is_known_locality(locality: Optional[str]) -> bool:
    if not locality:
        return True
    query = locality.lower().strip()
    return any(
        query in known.lower() or known.lower() in query
        for known in get_canonical_localities()
    )
