# Sample Voice Test Transcripts

Expected behavior for instructor manual testing. All sessions assume **Renter** persona, Bengaluru scope.

---

## Transcript 1 — Happy path rental search

| Turn | User | Expected agent |
|------|------|----------------|
| 1 | *(tap Speak — first session)* | Welcome greeting; asks how to help |
| 2 | "I want to rent in Indiranagar" | Asks budget + BHK for Indiranagar |
| 3 | "2 BHK under 50000" | Asks must-haves (metro, furnished, etc.) |
| 4 | "Near metro" | Searches; reads shortlist verdict; shows cards |
| 5 | "Brigade Parkview Indiranagar" | Opens site visit booking flow |

**Pass criteria:** No purchase prompt; Indiranagar not confused with RT Nagar; preferences asked before search.

---

## Transcript 2 — Off-topic recovery

| Turn | User | Expected agent |
|------|------|----------------|
| 1 | "Who is the prime minister of India?" | Short decline + "continue? yes or no" |
| 2 | "Yes" | Resumes rental question (area / budget / prefs) |
| 3 | "No" | Session cleared message |

**Pass criteria:** Does not jump to locality before user says yes.

---

## Transcript 3 — Purchase decline

| Turn | User | Expected agent |
|------|------|----------------|
| 1 | "I want to buy a 3BHK in Koramangala" | Rental-only decline; asks rent area + budget |

**Pass criteria:** Zero listings returned; no buyer interview advance.

---

## Transcript 4 — ASR locality fuzzy match

| Turn | User | Expected agent |
|------|------|----------------|
| 1 | "Indira nager 2 bhk under 40k" | Treats as Indiranagar; continues interview or searches |

**Pass criteria:** Locality resolves to Indiranagar (see `tests/voice_agent_regression.test.js`).

---

## Transcript 5 — RT Nagar vs Indiranagar confirmation

| Turn | User | Expected agent |
|------|------|----------------|
| 1 | "RT Nagar" *(STT confusion)* | "Did you mean Indiranagar or R T Nagar?" |

**Pass criteria:** Does not silently pick wrong neighborhood.

---

## Transcript 6 — Post-discovery booking by name

| Turn | User | Expected agent |
|------|------|----------------|
| 1 | *(after 1 result on screen)* "Godrej Greens" | Opens booking for matched property (not generic "which property?") |

**Pass criteria:** `isConfidentPropertyNamePick` path (BUG 055).

---

## Transcript 7 — Backend MCP citation (API)

```bash
curl -s -X POST http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"user_query":"How far is metro from Indiranagar?"}'
```

**Expected JSON fields:**

- `intent`: `LIVE_TRANSIT_POI`
- `citations[0].source_id`: `SRC_OSM_MCP`
- Answer mentions Indiranagar Metro / Purple Line

---

## Transcript 8 — Site visit booking (API)

```bash
curl -s -X POST http://localhost:8000/api/schedule-site-visit \
  -H 'Content-Type: application/json' \
  -d '{
    "listing_id": "rent_bengaluru_indiranagar_1",
    "visit_date": "2026-09-15",
    "time_slot": "10:00 AM - 11:00 AM",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210"
  }'
```

**Pass criteria:** HTTP 200; broker assigned; confirmation email attempted (SMTP/OAuth).

---

## Automated equivalents

| Transcript | Automated test |
|------------|----------------|
| 2, 3 | `tests/intent_detection.test.js` |
| 4, 5, 6 | `tests/voice_agent_regression.test.js` |
| 7 | `tests/evals/test_negative_edge_cases.py` (metro routing) |
| 8 | Manual / `scripts/test_end_to_end_voice_flow.py` |

Log new sessions in `bugs.md` when behavior diverges.
