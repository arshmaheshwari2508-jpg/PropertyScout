# Property Scout — Voice-First AI Rental Agent (Bengaluru)

Voice-first rental discovery for **one city** (Bengaluru), **three neighborhoods** (Indiranagar, Koramangala, Whitefield), and **15 curated listings** — focused on quality over coverage.

| Live demo | Backend API |
|-----------|-------------|
| [property-scout-beryl.vercel.app](https://property-scout-beryl.vercel.app) | [propertyscout-production.up.railway.app](https://propertyscout-production.up.railway.app) |

---

## Architecture (high level)

```
User (mic / chat)
    → VoiceHUD + App.jsx state machine (STT/TTS, buyer steps 0–6)
    → Intent layer (intentDetection.js ↔ query_router.py)
    → Listings filter (15 curated rentals) + soft preferences
    → Site visit booking (FastAPI + SQLite brokers)

Backend /api/chat (optional deep path):
    → RAGPolicyEngine → Weighted RAG (ChromaDB) + OSM MCP client + citations
```

**Layers**

| Layer | Location | Role |
|-------|----------|------|
| Voice UI | `src/App.jsx`, `src/components/VoiceHUD.jsx` | STT/TTS loop, interview, booking |
| Intent | `src/utils/intentDetection.js`, `src/grounding/query_router.py` | Rental / purchase / off-topic routing |
| Grounding | `src/grounding/rag_policy_engine.py`, `weighted_rag_engine.py` | Listings, metro, safety, neighborhood RAG |
| MCP clients | `src/grounding/osm_mcp_client.py`, `google_mcp_client.py` | Spatial + Gmail/Calendar integration |
| Data | `data/listings.json`, `Docs/neighborhood_guides.jsonl` | Scoped dataset + guides |
| Evals | `tests/`, `bugs.md`, `.github/workflows/evals.yml` | Regression + pytest suites |

Full diagram: [`architecture.md`](architecture.md)

---

## Scope constraints (instructor eval)

| Constraint | Implementation |
|------------|----------------|
| One city | Bengaluru only (`city: "Bengaluru"`) |
| Max 15 listings | `data/listings.json` — 5 per neighborhood |
| Max 3 neighborhood guides | `Docs/neighborhood_guides.jsonl` |
| Quality over coverage | Curated rents, PII scrubbed, cited sources |

Manifest: `data/dataset_manifest.json`  
Details: [`Docs/DATASET.md`](Docs/DATASET.md)

---

## Setup

### Prerequisites

- Node 18+
- Python 3.10+
- Mic + Chrome/Edge (Web Speech API)

### 1. Clone & install

```bash
git clone https://github.com/arshmaheshwari2508-jpg/PropertyScout.git
cd PropertyScout
npm install
pip install -r requirements.txt
cp .env.example .env   # optional: Gemini, SMTP, Google OAuth
```

### 2. Build curated dataset (15 listings)

```bash
python3 scripts/build_curated_dataset.py
```

### 3. Run locally

```bash
# Terminal 1 — frontend
npm run dev

# Terminal 2 — backend (listings, booking, /api/chat, sources)
npm run dev:api
```

Open http://localhost:5173 → **Renter** → **Speak**.

### 4. Ingest RAG knowledge base (optional, for /api/chat)

```bash
python3 scripts/run_phase1_ingestion.py
```

---

## MCP integration

Property Scout uses **MCP-style client modules** that wrap external tool APIs with a consistent interface for the RAG policy engine:

| Client | File | Purpose |
|--------|------|---------|
| OpenStreetMap MCP | `src/grounding/osm_mcp_client.py` | Metro distance, POI counts, haversine geometry |
| Google MCP | `src/grounding/google_mcp_client.py` | Gmail confirmation + Calendar site-visit events |

How routing works, citation IDs, and env vars: [`Docs/MCP_INTEGRATION.md`](Docs/MCP_INTEGRATION.md)

**Sources view:** In the app, open **Sources** (citation inspector drawer) — loads live from `GET /api/sources` → `Docs/sources.jsonl`.

---

## Dataset (scraped & cleaned)

- **Source:** [bengaluru.rent](https://bengaluru.rent) (HTTP scrape with structured fallback)
- **Cleaning:** `src/data/pii_scrubber.py` removes phones, emails, owner fields
- **Scope cap:** `scripts/build_curated_dataset.py` enforces 15 listings / 3 neighborhoods

Full pipeline: [`Docs/DATASET.md`](Docs/DATASET.md)

---

## How to run evals

```bash
# Voice / intent regression (Node, 50 tests)
npm run test:voice

# Backend RAG + dialogue evals (pytest, ~70 tests)
npm run test:backend

# Everything (same as CI)
npm run test:evals
```

Manual eval spec: [`test.md`](test.md) (TC-NEG-001 … TC-NEG-050)  
Bug-driven regressions: [`bugs.md`](bugs.md)  
Sample voice transcripts: [`Docs/SAMPLE_TRANSCRIPTS.md`](Docs/SAMPLE_TRANSCRIPTS.md)

Details: [`Docs/EVALS.md`](Docs/EVALS.md)

---

## Evaluation rubric mapping

| Rubric (weight) | Evidence in repo |
|-----------------|------------------|
| Voice UX & intent (25%) | `App.jsx`, `intentDetection.js`, `voiceAgentLogic.js`, `tests/voice_*` |
| MCP & system design (20%) | `osm_mcp_client.py`, `rag_policy_engine.py`, `Docs/MCP_INTEGRATION.md` |
| Grounding & RAG (15%) | `weighted_rag_engine.py`, `Docs/sources.jsonl`, `neighborhood_guides.jsonl` |
| AI evals & iteration (20%) | `tests/evals/`, `bugs.md`, `.github/workflows/evals.yml` |
| Workflow automation (10%) | Booking API, email, `workflows/site_visit_pdf_workflow.json` |
| Deployment & quality (10%) | Vercel + Railway, Dockerfile, this README |

---

## Project docs

| Document | Description |
|----------|-------------|
| [`Docs/MCP_INTEGRATION.md`](Docs/MCP_INTEGRATION.md) | MCP clients & routing |
| [`Docs/DATASET.md`](Docs/DATASET.md) | Scraping & cleaning |
| [`Docs/EVALS.md`](Docs/EVALS.md) | Running automated evals |
| [`Docs/SAMPLE_TRANSCRIPTS.md`](Docs/SAMPLE_TRANSCRIPTS.md) | Example voice sessions |
| [`bugs.md`](bugs.md) | Bug tracker + guardrails |
| [`deploymentplan.md`](deploymentplan.md) | Vercel / Railway deploy |

---

## License & academic use

Graduation project — Bengaluru rental scout prototype. Listings are curated demo data; not a production brokerage.
