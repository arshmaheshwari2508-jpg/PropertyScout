# AI Evaluations

Property Scout uses **automated regression tests** + a **manual negative test spec** + **bug-driven guardrails** (`bugs.md`).

## Quick start

```bash
# All evals (CI runs this)
npm run test:evals

# Voice / intent only (Node)
npm run test:voice

# Backend RAG / dialogue (pytest)
npm run test:backend
```

## Test suites

| Suite | Command | Count | Covers |
|-------|---------|-------|--------|
| Intent detection | `npm run test:intent` | 14 | Purchase decline, off-topic, slot prompts |
| Voice regression | `npm run test:regression` | 31 | ASR locality, booking, post-discovery |
| Voice interrupt | `npm run test:voice-interrupt` | 5 | Barge-in rules |
| Negative edge cases | `pytest tests/evals/test_negative_edge_cases.py` | 40+ | TC-NEG mapping, RAG policy |
| Voice scenarios | `pytest tests/evals/test_voice_scenarios.py` | 15+ | Multi-turn backend voice |
| Conversational skills | `pytest tests/evals/test_conversational_skills.py` | 10+ | Persona / delta engine |
| Locality resolver | `pytest tests/test_locality_resolver.py` | 5+ | Python locality aliases |

**Total:** ~120 automated tests.

## CI

GitHub Actions workflow: **`.github/workflows/evals.yml`**

Runs on every push/PR to `main`:

1. `npm run test:voice`
2. `pytest tests/evals tests/test_locality_resolver.py -q`

## Manual eval spec

[`test.md`](../test.md) — 50 structured cases (TC-NEG-001 … TC-NEG-050):

- Unsupported intents (buy, weather, jokes)
- Strict BHK anti-leakage
- Metro MCP routing & citations
- Non-binary safety policy
- Broker slot collision

## Iteration depth (`bugs.md`)

Each bug entry includes:

1. Reported symptom  
2. Root cause  
3. Fix & guardrail rule  
4. Linked regression test file  

Recent examples: BUG 054 (off-topic flow), BUG 055 (property name → booking).

## Phase verification scripts

| Script | Purpose |
|--------|---------|
| `scripts/run_phase1_ingestion.py` | ChromaDB KB ingest |
| `scripts/run_phase2_verification.py` | Citation + RAG smoke |
| `scripts/run_phase3_verification.py` | Dialogue manager |
| `scripts/run_phase4_verification.py` | End-to-end API |
| `scripts/test_voice_agent_scenarios.py` | Backend voice scenarios |
| `scripts/test_end_to_end_voice_flow.py` | CLI voice flow |

## What is NOT automated

- Browser Web Speech API (mic/TTS) — manual per `bugs.md` verification notes  
- Vercel production smoke — manual hard-refresh after deploy  

## Adding a regression test

1. Reproduce bug → document in `bugs.md`  
2. Add failing test in `tests/intent_detection.test.js` or `tests/voice_agent_regression.test.js`  
3. Fix code → `npm run test:evals`  
4. Reference test path in bug entry  

## Sample transcripts

See [`SAMPLE_TRANSCRIPTS.md`](SAMPLE_TRANSCRIPTS.md) for expected multi-turn voice sessions.
