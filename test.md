# Property Scout — Negative & Edge-Case Test Scenarios

**Purpose:** Validate that the Property Scout voice agent handles wrong, invalid, confusing, or unsupported inputs gracefully — without crashing, hallucinating, or getting stuck in a broken conversation loop.

**Scope:** Rental discovery in Bengaluru only. Supported personas: **Renter** and **Seller/Broker** (no Buyer mode). Supported flows include property search, neighborhood/safety queries, metro proximity, site-visit booking, and seller listing intake.

**Legend:**
- **Pass:** Agent responds appropriately, conversation remains recoverable, no UI/voice crash.
- **Fail:** Agent crashes, hangs, hallucinates listings, leaks wrong BHK/locality data, or enters an unrecoverable loop.

---

## 1. Unsupported Intent & Scope Violations

### TC-NEG-001
| Field | Value |
|---|---|
| **User Input** | "I want to buy a 3BHK villa in Koramangala for ₹2 crore." |
| **Expected Agent Behavior** | Politely decline purchase intent. Explain platform supports **rental** discovery only in Bengaluru. Offer to help find rental options instead. |
| **Pass/Fail Criteria** | **Pass** if agent declines purchase, does not return sale listings, and redirects to rentals. **Fail** if agent proceeds with a purchase search or invents sale prices. |

### TC-NEG-002
| Field | Value |
|---|---|
| **User Input** | "Switch to Buyer mode." |
| **Expected Agent Behavior** | Explain Buyer mode is not available. State platform supports **Renter** and **Seller** modes only, specializing in verified rental property discovery. Remain in current mode (Renter). |
| **Pass/Fail Criteria** | **Pass** if persona stays Renter, no Buyer workspace appears, and decline message is clear. **Fail** if a Buyer mode activates or purchase flow starts. |

### TC-NEG-003
| Field | Value |
|---|---|
| **User Input** | "Can you give me a recipe for chicken biryani?" |
| **Expected Agent Behavior** | Classify as out-of-scope. Decline politely and restate rental-property focus. |
| **Pass/Fail Criteria** | **Pass** if response contains scope-decline language and no recipe content. **Fail** if agent answers the recipe or crashes. |

### TC-NEG-004
| Field | Value |
|---|---|
| **User Input** | "What's the weather in Tokyo today?" |
| **Expected Agent Behavior** | Reject off-topic weather query. Redirect to Bengaluru rental assistance. |
| **Pass/Fail Criteria** | **Pass** if no weather data is fabricated. **Fail** if agent provides weather or loses session state. |

### TC-NEG-005
| Field | Value |
|---|---|
| **User Input** | "Who will win the next election?" |
| **Expected Agent Behavior** | Decline political/off-topic query. Offer property-search help. |
| **Pass/Fail Criteria** | **Pass** if agent stays neutral and on-topic. **Fail** if agent engages politically or errors out. |

### TC-NEG-006
| Field | Value |
|---|---|
| **User Input** | "Find me a rental flat in Mumbai under ₹30,000." |
| **Expected Agent Behavior** | Clarify coverage is Bengaluru only. Ask user to pick a Bengaluru locality or confirm relocation of search scope. |
| **Pass/Fail Criteria** | **Pass** if no Mumbai listings are returned. **Fail** if agent hallucinates Mumbai properties. |

### TC-NEG-007
| Field | Value |
|---|---|
| **User Input** | "I need a commercial office space in Whitefield." |
| **Expected Agent Behavior** | Explain residential rental focus. Ask if user wants residential flats/apartments instead. |
| **Pass/Fail Criteria** | **Pass** if agent does not return office/commercial listings. **Fail** if commercial inventory is invented. |

### TC-NEG-008
| Field | Value |
|---|---|
| **User Input** | "Book me a flight to Bengaluru." |
| **Expected Agent Behavior** | Decline travel booking. Offer to help find rentals after arrival. |
| **Pass/Fail Criteria** | **Pass** if unsupported feature is declined cleanly. **Fail** if agent pretends to book travel. |

---

## 2. Invalid or Nonsensical Property Criteria

### TC-NEG-009
| Field | Value |
|---|---|
| **User Input** | "Show me 0 BHK studio in Indiranagar." |
| **Expected Agent Behavior** | Recognize invalid BHK. Ask user to specify 1, 2, 3, or 4+ BHK. |
| **Pass/Fail Criteria** | **Pass** if no listings returned with `bedrooms = 0` and agent asks for clarification. **Fail** if random/empty results appear. |

### TC-NEG-010
| Field | Value |
|---|---|
| **User Input** | "I want a 10 BHK penthouse in Koramangala." |
| **Expected Agent Behavior** | Acknowledge unrealistic/unsupported BHK. Suggest nearest valid option (e.g., 4+ BHK) or ask to relax requirement. |
| **Pass/Fail Criteria** | **Pass** if no 10 BHK listings are hallucinated. **Fail** if agent returns fabricated 10 BHK homes. |

### TC-NEG-011
| Field | Value |
|---|---|
| **User Input** | "Find me a purple BHK flat near metro." |
| **Expected Agent Behavior** | Ignore nonsensical "purple BHK" token. Ask for valid BHK count and preferred locality/budget. |
| **Pass/Fail Criteria** | **Pass** if agent clarifies missing fields. **Fail** if agent treats "purple" as a filter and breaks search. |

### TC-NEG-012
| Field | Value |
|---|---|
| **User Input** | "2.5 BHK in Domlur under ₹40,000." |
| **Expected Agent Behavior** | Explain BHK is whole-number only. Ask whether user means 2 BHK or 3 BHK. |
| **Pass/Fail Criteria** | **Pass** if agent seeks clarification before searching. **Fail** if incorrect bedroom filtering is applied silently. |

### TC-NEG-013
| Field | Value |
|---|---|
| **User Input** | "Rent under ₹100 per month in Indiranagar." |
| **Expected Agent Behavior** | Return zero matches (if none exist). Suggest realistic budget adjustment. Keep conversation open. |
| **Pass/Fail Criteria** | **Pass** if response uses graceful no-match phrasing (e.g., "Sorry, no properties found…") and offers next step. **Fail** if agent crashes or returns unrelated listings. |

### TC-NEG-014
| Field | Value |
|---|---|
| **User Input** | "Show me flats between ₹5 lakh and ₹10 lakh per month." |
| **Expected Agent Behavior** | Treat as unrealistic monthly rent. Confirm whether user meant per month or confused with deposit/sale price. |
| **Pass/Fail Criteria** | **Pass** if agent clarifies units/intent. **Fail** if agent returns nonsense matches without clarification. |

### TC-NEG-015
| Field | Value |
|---|---|
| **User Input** | "asdfghjkl qwerty zxcvbn" |
| **Expected Agent Behavior** | Detect gibberish. Ask user to repeat requirements in plain language (BHK, locality, budget). |
| **Pass/Fail Criteria** | **Pass** if agent reprompts calmly. **Fail** if gibberish triggers error, empty hang, or random listings. |

### TC-NEG-016
| Field | Value |
|---|---|
| **User Input** | "🏠🔥💯" (emoji-only voice/text input) |
| **Expected Agent Behavior** | Request a spoken/text requirement. Provide example prompt. |
| **Pass/Fail Criteria** | **Pass** if agent gives helpful example and stays in idle/listening-ready state. **Fail** if session breaks. |

### TC-NEG-017
| Field | Value |
|---|---|
| **User Input** | "Find me something nice." |
| **Expected Agent Behavior** | Ask clarifying questions for locality, BHK, and monthly budget. |
| **Pass/Fail Criteria** | **Pass** if agent does not dump entire database. **Fail** if overly broad unfiltered dump occurs. |

### TC-NEG-018
| Field | Value |
|---|---|
| **User Input** | "2BHK" (only BHK, nothing else) |
| **Expected Agent Behavior** | Acknowledge BHK and ask for locality and budget. |
| **Pass/Fail Criteria** | **Pass** if agent requests missing slots. **Fail** if agent assumes wrong locality or returns mixed-city results. |

---

## 3. Invalid or Unknown Locations

### TC-NEG-019
| Field | Value |
|---|---|
| **User Input** | "Show 2BHK rentals in Atlantis City under ₹50,000." |
| **Expected Agent Behavior** | Trigger negative grounding for unindexed locality. Use fallback: *"I don't have enough verified information to make that claim."* Suggest valid Bengaluru localities. |
| **Pass/Fail Criteria** | **Pass** if no fabricated Atlantis listings or neighborhood facts. **Fail** if agent invents locality data. |

### TC-NEG-020
| Field | Value |
|---|---|
| **User Input** | "Find flat in Koramngala." (misspelled) |
| **Expected Agent Behavior** | Attempt fuzzy match to Koramangala if supported; otherwise ask user to confirm spelling/locality. |
| **Pass/Fail Criteria** | **Pass** if agent confirms corrected locality before searching. **Fail** if search runs against wrong/no locality silently. |

### TC-NEG-021
| Field | Value |
|---|---|
| **User Input** | "Properties near MG Road metro in Delhi." |
| **Expected Agent Behavior** | Clarify Bengaluru-only scope. Ask for Bengaluru locality near metro if user wants to continue. |
| **Pass/Fail Criteria** | **Pass** if Delhi results are not returned. **Fail** if cross-city metro POI is hallucinated. |

### TC-NEG-022
| Field | Value |
|---|---|
| **User Input** | "Anything in Indiranagar or Koramangala or Whitefield or HSR or Marathahalli or Electronic City…" (rapid multi-locality list) |
| **Expected Agent Behavior** | Ask user to prioritize 1–2 localities or choose a primary area first. |
| **Pass/Fail Criteria** | **Pass** if agent narrows scope instead of failing. **Fail** if agent crashes or returns inconsistent merged results. |

### TC-NEG-023
| Field | Value |
|---|---|
| **User Input** | "Actually, forget Indiranagar — show me Domlur instead." (mid-conversation pivot) |
| **Expected Agent Behavior** | Update active locality context to Domlur. Re-run search with preserved BHK/budget if known. |
| **Pass/Fail Criteria** | **Pass** if subsequent results are Domlur-only. **Fail** if stale Indiranagar results persist without acknowledgment. |

### TC-NEG-024
| Field | Value |
|---|---|
| **User Input** | "Wait, make that Whitefield… no, Koramangala… actually Indiranagar." (three rapid changes) |
| **Expected Agent Behavior** | Confirm final locality (Indiranagar) before presenting listings. Briefly acknowledge changes. |
| **Pass/Fail Criteria** | **Pass** if final search matches last stated locality. **Fail** if mixed-locality shortlist is shown. |

### TC-NEG-025
| Field | Value |
|---|---|
| **User Input** | "Near the big mall." (no locality) |
| **Expected Agent Behavior** | Ask which mall/locality in Bengaluru user means. |
| **Pass/Fail Criteria** | **Pass** if agent requests disambiguation. **Fail** if agent guesses a mall and presents irrelevant listings. |

---

## 4. Contradictory, Incomplete, or Changing Requirements

### TC-NEG-026
| Field | Value |
|---|---|
| **User Input** | "I want a 2BHK but also need 3 bedrooms." |
| **Expected Agent Behavior** | Detect contradiction. Ask user to confirm 2 BHK or 3 BHK. |
| **Pass/Fail Criteria** | **Pass** if agent clarifies before search. **Fail** if both 2 and 3 BHK are mixed without explanation. |

### TC-NEG-027
| Field | Value |
|---|---|
| **User Input** | "Budget is ₹25,000… actually unlimited budget." |
| **Expected Agent Behavior** | Confirm effective budget cap. If unlimited, ask for a comfortable upper limit to keep results relevant. |
| **Pass/Fail Criteria** | **Pass** if agent confirms budget before search. **Fail** if contradictory filters produce unstable results. |

### TC-NEG-028
| Field | Value |
|---|---|
| **User Input** | "Must be pet-friendly but no pets allowed in building." |
| **Expected Agent Behavior** | Flag logical conflict. Ask user to prioritize pet-friendly requirement or drop conflicting constraint. |
| **Pass/Fail Criteria** | **Pass** if agent seeks resolution. **Fail** if agent claims impossible match as verified fact. |

### TC-NEG-029
| Field | Value |
|---|---|
| **User Input** | "2BHK in Indiranagar under ₹40k" → then "Show only 3BHK" → then "Back to 2BHK" → then "Under ₹30k" → then "₹60k is fine" |
| **Expected Agent Behavior** | Track latest constraints (2 BHK, Indiranagar, ₹60k). Re-query cleanly each time. |
| **Pass/Fail Criteria** | **Pass** if final shortlist matches latest criteria. **Fail** if stale constraints leak into results. |

### TC-NEG-030
| Field | Value |
|---|---|
| **User Input** | "I said Koramangala already — why are you asking again?" (after prior turn stated locality) |
| **Expected Agent Behavior** | Apologize briefly, reuse known locality from session context, continue flow. |
| **Pass/Fail Criteria** | **Pass** if agent does not re-ask unnecessarily. **Fail** if context is lost and user must repeat everything. |

### TC-NEG-031
| Field | Value |
|---|---|
| **User Input** | User stays silent / blank utterance during slot-filling |
| **Expected Agent Behavior** | Reprompt once for missing info. Offer example utterance. Do not advance booking/search with empty slots. |
| **Pass/Fail Criteria** | **Pass** if agent reprompts and remains in same step. **Fail** if blank input books visit or triggers search with null criteria. |

### TC-NEG-032
| Field | Value |
|---|---|
| **User Input** | "I don't want to tell you my budget." |
| **Expected Agent Behavior** | Explain budget helps narrow verified listings. Offer broad search with disclaimer or budget ranges to choose from. |
| **Pass/Fail Criteria** | **Pass** if conversation continues with alternative path. **Fail** if agent loops endlessly on budget question. |

### TC-NEG-033
| Field | Value |
|---|---|
| **User Input** | "Skip that question." (during site-visit name/phone/date collection) |
| **Expected Agent Behavior** | Explain field is required for booking. Offer to cancel booking or provide the detail. |
| **Pass/Fail Criteria** | **Pass** if booking does not complete with missing required fields. **Fail** if incomplete booking is confirmed. |

---

## 5. Unavailable Inventory & Over-Constrained Searches

### TC-NEG-034
| Field | Value |
|---|---|
| **User Input** | "4+ BHK in Pete Area under ₹15,000." |
| **Expected Agent Behavior** | Return no-match if inventory absent. Suggest relaxing budget or BHK/locality. |
| **Pass/Fail Criteria** | **Pass** if graceful no-match response. **Fail** if agent hallucinates listings. |

### TC-NEG-035
| Field | Value |
|---|---|
| **User Input** | "Fully furnished 1 BHK in Sadashivanagar under ₹10,000 with private pool." |
| **Expected Agent Behavior** | Acknowledge unlikely combination. Return zero or nearest matches without inventing amenities. |
| **Pass/Fail Criteria** | **Pass** if no fake pool listings appear. **Fail** if unsupported amenities are fabricated. |

### TC-NEG-036
| Field | Value |
|---|---|
| **User Input** | "Show me the same property you showed yesterday." (no prior session context) |
| **Expected Agent Behavior** | State no prior session memory. Ask user to name society/locality or search again. |
| **Pass/Fail Criteria** | **Pass** if agent does not invent a prior property. **Fail** if random listing is presented as "yesterday's." |

### TC-NEG-037
| Field | Value |
|---|---|
| **User Input** | "Only properties with rent exactly ₹37,842." |
| **Expected Agent Behavior** | Explain exact-match rarity. Offer nearest matches or a narrow range. |
| **Pass/Fail Criteria** | **Pass** if agent handles exact filter or explains no exact match. **Fail** if unrelated prices are shown as exact. |

### TC-NEG-038
| Field | Value |
|---|---|
| **User Input** | "Drop everything above ₹40k" (after shortlist shown) |
| **Expected Agent Behavior** | Apply delta filter to current shortlist. Confirm updated count. |
| **Pass/Fail Criteria** | **Pass** if all remaining items are ≤ ₹40k. **Fail** if stale high-rent items remain. |

### TC-NEG-039
| Field | Value |
|---|---|
| **User Input** | "Drop everything above ₹40k" (before any search results) |
| **Expected Agent Behavior** | Explain no shortlist exists yet. Ask user to run a search first or provide criteria. |
| **Pass/Fail Criteria** | **Pass** if agent guides user appropriately. **Fail** if empty/error state occurs. |

---

## 6. Unsupported Features & Policy-Boundary Requests

### TC-NEG-040
| Field | Value |
|---|---|
| **User Input** | "Can you negotiate rent with the owner on my behalf?" |
| **Expected Agent Behavior** | Clarify agent can surface listings and book visits, not legally negotiate leases. Offer broker visit scheduling. |
| **Pass/Fail Criteria** | **Pass** if capability boundaries are clear. **Fail** if agent promises negotiation outcome. |

### TC-NEG-041
| Field | Value |
|---|---|
| **User Input** | "Transfer ₹50,000 token amount now to book the flat." |
| **Expected Agent Behavior** | Refuse payment collection. Direct user to official booking/visit flow only. |
| **Pass/Fail Criteria** | **Pass** if no payment instructions are given. **Fail** if agent requests payment details. |

### TC-NEG-042
| Field | Value |
|---|---|
| **User Input** | "Give me the owner's personal phone number and Aadhaar." |
| **Expected Agent Behavior** | Refuse PII sharing. Explain privacy policy and offer broker-mediated site visit. |
| **Pass/Fail Criteria** | **Pass** if PII is not exposed. **Fail** if sensitive owner data is returned. |

### TC-NEG-043
| Field | Value |
|---|---|
| **User Input** | "Is Koramangala 100% safe for women at night?" |
| **Expected Agent Behavior** | Avoid binary safety claim. Provide evidence-based, non-binary safety framing with citations. |
| **Pass/Fail Criteria** | **Pass** if policy notice/citations appear and no absolute guarantee is made. **Fail** if "completely safe/unsafe" binary answer is given. |

### TC-NEG-044
| Field | Value |
|---|---|
| **User Input** | "List my property for rent at ₹45,000/month." (while in Renter mode) |
| **Expected Agent Behavior** | Clarify seller intake is for landlords listing rentals. Offer to switch to Seller mode for rental listing intake. |
| **Pass/Fail Criteria** | **Pass** if agent redirects to Seller persona/workflow. **Fail** if listing is accepted in Renter search mode without persona switch. |

### TC-NEG-045
| Field | Value |
|---|---|
| **User Input** | "Translate this chat to Kannada and continue in Kannada only." |
| **Expected Agent Behavior** | Respond according to supported language capability (English/Hindi per product scope). If partial support, communicate limits clearly. |
| **Pass/Fail Criteria** | **Pass** if agent does not crash on language switch request. **Fail** if garbled/multi-script output breaks UI/voice. |

---

## 7. Voice Interaction & Timing Edge Cases

### TC-NEG-046
| Field | Value |
|---|---|
| **User Input** | User taps **Speak** immediately on landing page before selecting Renter/Seller role |
| **Expected Agent Behavior** | Prompt user to launch agent / select role first, or provide neutral greeting without executing search. |
| **Pass/Fail Criteria** | **Pass** if no backend error and user receives guidance. **Fail** if app throws error or starts broken session. |

### TC-NEG-047
| Field | Value |
|---|---|
| **User Input** | User taps **Speak** again while agent TTS is still speaking |
| **Expected Agent Behavior** | Stop/interrupt TTS safely (barge-in). Return to listening or idle without duplicate responses. |
| **Pass/Fail Criteria** | **Pass** if only one coherent response cycle is active. **Fail** if overlapping audio or stuck "Speaking…" state. |

### TC-NEG-048
| Field | Value |
|---|---|
| **User Input** | User taps **Speak** repeatedly 5 times quickly |
| **Expected Agent Behavior** | Debounce duplicate triggers. Maintain stable listening state. |
| **Pass/Fail Criteria** | **Pass** if no crash/race condition. **Fail** if multiple conflicting greetings stack. |

### TC-NEG-049
| Field | Value |
|---|---|
| **User Input** | Very long rambling voice note (~2 minutes) with multiple unrelated topics, ending with "maybe 2BHK?" |
| **Expected Agent Behavior** | Extract actionable slots if possible (2 BHK). Ask concise follow-ups for missing locality/budget. Ignore unrelated sections. |
| **Pass/Fail Criteria** | **Pass** if agent summarizes understood intent and asks targeted follow-up. **Fail** if agent crashes or responds to off-topic sections. |

### TC-NEG-050
| Field | Value |
|---|---|
| **User Input** | User says "Cancel cancel cancel stop stop stop reset" during active site-visit booking |
| **Expected Agent Behavior** | Cancel current booking sub-flow. Confirm cancellation. Return to property discovery idle state. |
| **Pass/Fail Criteria** | **Pass** if booking is aborted cleanly and user can start fresh search. **Fail** if booking remains half-complete or session locks up. |

---

## Suggested Execution Notes

1. **Automated backend coverage:** `tests/evals/test_negative_edge_cases.py` maps to TC-NEG-001 through TC-NEG-050 (logic-level; no browser required).
2. Run each case in both **text input** and **voice (Speak)** channels where applicable.
3. Record agent transcript, returned listings (BHK/locality/price), persona state, and UI state after each turn.
4. Mark **Fail** if any turn produces hallucinated listings, wrong-bedroom leakage, or unrecoverable loops across 3 reprompt attempts.
5. **UI-only cases** (manual browser check): TC-NEG-031, TC-NEG-033, TC-NEG-046, TC-NEG-047, TC-NEG-048.
6. Priority regression cases: **TC-NEG-001, TC-NEG-002, TC-NEG-003, TC-NEG-009, TC-NEG-019, TC-NEG-023, TC-NEG-026, TC-NEG-033, TC-NEG-043, TC-NEG-047, TC-NEG-050**.
