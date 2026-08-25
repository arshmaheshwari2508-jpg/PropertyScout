# Voice-First AI Property Scout — Project Rules & Technical Guidelines

> **Project Name:** Voice-First AI Property Scout (Bengaluru Real Estate)  
> **Primary Technology Stack:** Gemini 2.5 Flash (Voice STT), Gemini 2.5 Flash Lite (LLM Reasoning), Smallest AI (TTS Engine), `BAAI/bge-small-en-v1.5` (FastEmbed), ChromaDB, OpenStreetMap MCP, n8n Workflow Engine.

---

## 🎯 1. Architectural Blueprint & Core Principles

### 1.1 Strict 4-Layer Separation of Responsibilities
To eliminate hallucination and maintain strict data integrity, all user queries MUST be routed according to the 4 separation layers:

1. **`bengaluru.rent` Listings Database (`src/data/listings_db.py`)**:
   - Source of truth for active property listings, rents, sale prices, BHK, sqft, furnishing, and availability.
   - **CRITICAL RULE:** RAG is **NEVER** queried for current property listings or rental prices.
2. **`OpenStreetMap MCP` Server (`src/grounding/osm_mcp_client.py`)**:
   - Source of truth for nearby POIs, bus stops, hospitals, schools, supermarkets, and Namma Metro station distances.
   - **CRITICAL RULE:** RAG is **NEVER** used for exact spatial distances or live transit data.
3. **`Weighted RAG Knowledge Store` (`src/grounding/weighted_rag_engine.py`)**:
   - Ingests `localities.jsonl` (82 profiles), `sources.jsonl`, and `Readme.md` using **`BAAI/bge-small-en-v1.5`** embeddings.
   - Source of truth for neighborhood history, character, development, and context.
4. **`Safety Evidence Engine` (`safety_sources.jsonl`)**:
   - Source of truth for crime statistics.
   - **CRITICAL RULE:** Binary `"safe"` or `"unsafe"` ratings are **STRICTLY FORBIDDEN**. Output empirical crime statistics only.

---

## 🎙️ 2. Multimodal Voice & Reasoning Stack

- **Voice Input (STT):** **Gemini 2.5 Flash** (Native multimodal audio processing for ultra-fast, high-accuracy speech transcription).
- **LLM Reasoning Engine:** **Gemini 2.5 Flash Lite** (High-speed, cost-efficient reasoning & grounded response generation).
- **Voice Output (TTS):** **Smallest AI** (Waves / Lightning API — ultra-low latency <100ms natural speech synthesis).
- **Fallback Adapters:** Groq LPU (`llama-3.3-70b-versatile` & `whisper-large-v3-turbo`) and Edge-TTS / Web Speech API.

---

## 👥 3. Multi-Persona Workspace Switching

The system dynamically shifts AI dialogue states, financial metrics, and search rules across three personas:

- **Buyer Mode:** Total sale price, price/sqft, possession status, RERA standing, builder reputation, EMI estimates.
- **Renter Mode:** Monthly rent, security deposit terms, maintenance fees, lock-in period, tenant restrictions, pet policy.
- **Seller / Landlord / Broker Mode:** Property intake form + multiline **Seller Property Review & Highlights Text Box** (ingested into RAG with a **lower weightage of 0.3**).

---

## 🛡️ 4. RAG Retrieval & Safety Policy Rules

1. **Zero Cross-Locality Extrapolation:** Metadata pre-filtering (`locality == query_locality`) MUST be applied before vector distance calculation to prevent cross-locality leakage.
2. **Negative Grounding (`do_not_infer`):** Respect `do_not_infer` metadata arrays. If context is missing or forbidden, output the explicit fallback string:
   > *"I don't have enough verified information to make that claim."*
3. **Weighted Cosine Scoring:**
   $$\text{Final Score} = \text{CosineSimilarity} \times \text{SourceWeight}$$
   - Independent sources (Wiki, GBA, Karnataka Crime 2025): `SourceWeight = 1.0`
   - Seller property review notes (`seller_claim`): `SourceWeight = 0.3`
4. **Visual Citations:** 100% of factual claims MUST embed source IDs (`SRC_WIKI_NEIGHBORHOODS`, `SRC_GBA`, `SRC_KAR_POLICE_CRIME_2025`, `SRC_OSM_MCP`) resolved via `citation_resolver.py`.

---

## 🔒 5. PII Protection & Data Sanitization

- All property listings MUST be passed through `pii_scrubber.py` before database ingestion or state persistence.
- Strip all `owner_name`, `owner_phone`, `owner_email`, and `broker_name` keys.
- Redact 10-digit Indian phone numbers (`[REDACTED_PHONE]`) and email addresses (`[REDACTED_EMAIL]`) from listing description text.

---

## ⚙️ 6. Environment Configuration (`.env`)

```env
# Gemini API (STT & LLM)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_LLM_MODEL=gemini-2.5-flash-lite
GEMINI_STT_MODEL=gemini-2.5-flash

# Smallest AI (TTS Engine)
SMALLEST_API_KEY=your_smallest_ai_api_key_here
SMALLEST_TTS_MODEL=lightning
SMALLEST_VOICE_ID=emily

# Engine Selectors
LLM_ENGINE=gemini_flash_lite
STT_ENGINE=gemini_flash
TTS_ENGINE=smallest_ai

# Embeddings & Store
EMBEDDING_MODEL_NAME=BAAI/bge-small-en-v1.5
VECTOR_STORE_PATH=./data/chroma_db
```

---

## 🧪 7. Testing & Verification Commands

```bash
# Phase 1 Verification (PII Scrubber, Listings DB, BAAI/bge-small-en-v1.5 Ingestion)
python3 scripts/run_phase1_ingestion.py

# Phase 2 Verification (4-Layer Intent Router, Citation Resolver, OSM MCP, RAG Policy Engine)
python3 scripts/run_phase2_verification.py

# Complete AI Evaluation Test Suite
pytest tests/evals/ -v
```
