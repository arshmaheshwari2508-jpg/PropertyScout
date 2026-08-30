# Dataset — Collection & Cleaning

## Scope (instructor constraints)

| Field | Value |
|-------|--------|
| City | Bengaluru |
| Neighborhoods | Indiranagar, Koramangala, Whitefield |
| Max listings | 15 (5 per neighborhood) |
| Guide records | 3 (`Docs/neighborhood_guides.jsonl`) |

Machine-readable manifest: **`data/dataset_manifest.json`**

## Collection pipeline

```
bengaluru.rent (HTTP)
        │
        ▼ attempt fetch_live_web_listings()
        │
        ├── success → HTML regex parse (property cards)
        │
        └── fallback → deterministic structured generator
                (seed=2026, builder names, rent bands per locality)
        │
        ▼
PII scrubber (pii_scrubber.py)
        │
        ▼
Scope filter → 15 listings written to data/listings.json
        │
        ▼
Frontend seed → data/initial_listings.js
```

### Rebuild command

```bash
python3 scripts/build_curated_dataset.py
```

## Cleaning steps

1. **PII removal** (`src/data/pii_scrubber.py`)
   - Strips Indian phone numbers and emails from descriptions
   - Removes keys matching `owner|agent|contact|phone|email`
   - Replaces contact with `contact_type: Platform Agent` + opaque `contact_ref`

2. **Availability filter** (`src/data/listings_db.py`)
   - Only `availability_status` ∈ `Available`, `Ready`

3. **Locality normalization**
   - Exactly three canonical neighborhood names
   - No cross-city or out-of-scope localities in scoped dataset

4. **Rent realism**
   - Per-neighborhood rent bands (INR/month) in `scripts/build_curated_dataset.py`

## File layout

| File | Description |
|------|-------------|
| `data/listings.json` | 15 active rental listings (API + DB source) |
| `data/initial_listings.js` | Frontend bootstrap (mirrors listings.json) |
| `data/dataset_manifest.json` | Collection metadata for graders |
| `Docs/neighborhood_guides.jsonl` | 3 RAG neighborhood profiles |
| `Docs/sources.jsonl` | Citation taxonomy for grounding |

## Neighborhood guide records

Each line in `Docs/neighborhood_guides.jsonl` includes:

- `content` — factual neighborhood summary
- `sources` — e.g. `SRC_WIKI_NEIGHBORHOODS`, `SRC_OSM_MCP`
- `do_not_infer` — fields the agent must not hallucinate (safety score, exact rent, etc.)

Ingested by `src/grounding/kb_ingestor.py` into ChromaDB (`data/chroma_db/`).

## Auto-sync behavior

Railway backend **skips** live scraper auto-sync when `data/dataset_manifest.json` exists, preserving the curated 15-listing eval set.

To force live sync (not recommended for grading):

```bash
rm data/dataset_manifest.json
AUTO_SYNC_ON_STARTUP=true npm run dev:api
```

## Provenance note

Live HTTP scrape against bengaluru.rent may fail in CI/sandbox; the pipeline falls back to **deterministic structured generation** using the same schema and PII rules as scraped records. This keeps evals reproducible while documenting real-world collection intent.
