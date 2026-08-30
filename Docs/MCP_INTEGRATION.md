# MCP Integration

Property Scout integrates external tools through **MCP-style Python clients** consumed by the RAG policy engine (`src/grounding/rag_policy_engine.py`). Each client returns structured JSON plus a citation `source_id` from `Docs/sources.jsonl`.

## Architecture

```
POST /api/chat { user_query }
        │
        ▼
IntentQueryRouter (query_router.py)
        │
        ├── LISTING_PRICING ──► PropertyListingsDB + weighted RAG
        ├── LIVE_TRANSIT_POI ─► OSM MCP client (metro / POI)
        ├── NEIGHBORHOOD_CONTEXT ► ChromaDB neighborhood guides
        ├── CRIME_SAFETY ───────► safety_sources.jsonl + Gemini synthesis
        └── OUT_OF_SCOPE ───────► rental-only decline
        │
        ▼
CitationResolver ──► source_id metadata for Sources drawer UI
```

## OpenStreetMap MCP (`SRC_OSM_MCP`)

**File:** `src/grounding/osm_mcp_client.py`

| Method | Returns |
|--------|---------|
| `get_metro_proximity(locality)` | Nearest Namma Metro station, line, haversine distance |
| `get_nearby_pois(locality, radius_m)` | Supermarket / hospital counts near coordinates |

**Used when:** User asks metro distance, commute, or POI proximity.  
**Cited in UI:** `NeighborhoodTelemetry.jsx` (source badges `SRC_OSM_MCP`).

**Configuration:** `.env.example` → `OSM_MCP_SERVER_URL` (optional external MCP server).  
Default implementation uses embedded Bengaluru metro coordinates + geometry helpers.

## Google MCP (`google_mcp_client.py`)

**File:** `src/grounding/google_mcp_client.py`

| Method | Returns |
|--------|---------|
| `send_email(...)` | Gmail API send for booking confirmation |
| `create_calendar_event(...)` | Google Calendar event for site visit |

**Used when:** `POST /api/schedule-site-visit` succeeds → `email_service.py` + `broker_booking_db.py`.

**Setup:** `scripts/authenticate_google_mcp.py` + `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`.

## Sources taxonomy

All MCP and KB outputs reference IDs in `Docs/sources.jsonl`:

| source_id | Role |
|-----------|------|
| `SRC_BENGALURU_RENT` | Listing prices & availability |
| `SRC_OSM_MCP` | Live spatial / metro geometry |
| `SRC_WIKI_NEIGHBORHOODS` | Neighborhood background |
| `SRC_KAR_POLICE_CRIME_2025` | Safety evidence (non-binary policy) |
| `SRC_GBA` | Administrative corroboration |

**Sources view:** `GET /api/sources` → `SourcesDrawer.jsx` in the frontend.

## Frontend vs backend paths

| Path | MCP usage |
|------|-----------|
| **Voice interview** (`App.jsx`) | Local intent + listings filter; metro/safety prompts use frontend telemetry grounded on OSM source IDs |
| **Chat API** (`/api/chat`) | Full RAGPolicyEngine with OSM client + Chroma RAG + citations |

For eval demos of MCP routing, use:

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"user_query":"How far is metro from Indiranagar?"}' | jq .citations
```

Expected citation: `SRC_OSM_MCP`.

## n8n workflow (optional automation)

`workflows/site_visit_pdf_workflow.json` defines a PDF shortlist webhook.  
Booking currently uses direct SMTP/Gmail; n8n is documented for extension.

See `workflows/READMEN8n.md`.
