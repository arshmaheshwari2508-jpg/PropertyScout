# Voice-First AI Property Scout — Master Bug Tracker (`bugs.md`)

> **Master Bug Registry & Anti-Regression Guardrail Rules:** Comprehensive audit log of all reported runtime bugs, root cause analyses, engineering fixes, and verification test guardrails to prevent regressions.

---

## 📌 Active & Resolved Bug Audit Trail

### 🔴 BUG 045: Voice Auto-Started on Entry & Mic Stayed Open After Property Suggestions
- **Reported Issue:** Conversation started automatically when entering command view; after property suggestions the mic stayed open and interrupted exploration. Expected flow: **Speak → Suggestions → Pause → Explore → Speak → Site Visit**.
- **Root Cause:**
  1. `handleSelectRole` and `handleResetSession` called `startListening(true)` without user clicking Speak.
  2. `executeBuyerFilter` used `speakText(verdictMsg, true)` reopening the mic immediately after suggestions.
  3. No post-discovery resume prompt when user clicked Speak again to book a visit.
- **Fix & Guardrail Rule:**
  1. **Never auto-start voice** on role select or new session — only on **Speak** button click.
  2. **Pause after suggestions:** Property verdict MUST use `speakText(msg, false)` so user can explore listings silently.
  3. **Resume for booking:** When `hasSearched && buyerStep >= 5`, next Speak click plays site-visit resume prompt then opens mic.
  4. Discovery interview steps (locality/budget/BHK) MAY keep `autoListenAfter = true` for continuous Q&A.
- **Verification:** Enter command view → silent until Speak. After suggestions → mic off. Speak again → booking help prompt.

---

### 🔴 BUG 044: Stop Voice Button Does Not Fully Stop Agent (Speech + Mic Restart Loop)
- **Reported Issue:** Clicking **Stop Voice** while the agent was speaking did not stop the agent; speech continued or the microphone reopened immediately.
- **Root Cause:**
  1. `VoiceHUD.toggleListening()` called `onStopVoice()` then immediately `onStartListening(false)`, restarting speech recognition after cancel.
  2. `stopVoice()` in `App.jsx` did not clear `speechKeepAliveIntervalRef`, `sentenceWatchdogTimerRef`, `speechStartTimeoutRef`, or abort in-flight `speakText()` sentence chains — queued `setTimeout` / `onend` callbacks kept speaking or re-opened the mic.
- **Fix & Guardrail Rule:**
  1. **Stop Voice UI:** When `isPlayingAudio`, call `onStopVoice()` only — never auto-call `onStartListening`.
  2. **Hard Stop:** `stopVoice()` MUST set `speechCancelledRef = true`, clear all speech/listen timers/intervals, cancel `speechSynthesis`, abort recognition, and null `activeRecognitionRef`.
  3. **speakText Guard:** Every sentence advance, watchdog, keep-alive interval, and post-speech listen callback MUST check `speechCancelledRef` before continuing.
- **Verification:** Click Stop Voice mid-sentence → speech stops, mic stays off, button shows **Touch to Speak**. Vite build passes.

---

### 🔴 BUG 043: New Session Used Wrong Greeting & Skipped Original Voice Entry Flow
- **Reported Issue:** **New Session** played *"Starting a fresh session! Which neighborhood…"* and jumped to Step 1 locality prompt instead of the original *"Welcome to Property Scout! How should I help you today?"* entry flow.
- **Root Cause:** `handleResetSession` used a custom `welcomeMsg` + `speakText()` instead of `startListening(true)` used by `handleSelectRole` on first voice entry. `buyerFilterType` reset to `'all'` instead of `'rent'`.
- **Fix & Guardrail Rule:**
  1. **New Session = Fresh Entry:** Clear transcript, reset all buyer/seller/booking state, then call `startListening(true)` (mic permission → standard greeting → auto-listen).
  2. Greeting MUST remain: *"Welcome to Property Scout! How should I help you today?"*
  3. Reset `buyerFilterType` to `'rent'` to match Renter command view defaults.
- **Verification:** New Session → same greeting and Step 0 flow as landing-page voice entry.

---

### 🔴 BUG 042: Voice Site Visit Auto-Booked Without User Date, Time, Phone, or Email
- **Reported Issue:** Voice agent booked site visits with hardcoded date/time and placeholder contact (`Voice User`, `customer@scout.ai`, `+91 9876543210`). No confirmation email reached the user.
- **Root Cause:** `executeVoiceSiteVisitBooking` POSTed to `/api/schedule-site-visit` immediately with defaults, bypassing broker availability checks and user contact collection used by `BookingModal`.
- **Fix & Guardrail Rule:**
  1. **Voice booking interview:** date → time (with broker availability API) → name → phone → email → submit via shared `submitSiteVisitRequest()`.
  2. NEVER auto-book with placeholder contact data.
  3. Voice and **Schedule Visit** button MUST share `src/utils/siteVisitBooking.js`.
- **Verification:** Voice booking collects all fields; confirmation email sent to user-provided email.

---

### 🔴 BUG 041: BHK Step Silent Failure — Nested `initialListings` Array Crashed Property Search
- **Reported Issue:** After answering the BHK question, the agent did not respond or show properties.
- **Root Cause:** `initialListings` was accidentally nested as `[[...properties]]`. `executeBuyerFilter` called `.filter()` on malformed data → runtime error, no verdict speech.
- **Fix & Guardrail Rule:**
  1. `initialListings` MUST be a flat array of listing objects.
  2. Use `normalizeListings()` before any filter/search; search from live `shortlist` when available.
  3. Wrap `executeBuyerFilter` in try/catch with spoken failure fallback.
- **Verification:** Locality → budget → BHK → properties shown + voice verdict.

---

### 🔴 BUG 040: BHK Step Conversation Stopped After Results (Mic Not Reopened)
- **Reported Issue:** Agent spoke property results but did not continue listening; conversation felt "stuck" after BHK.
- **Root Cause:** `executeBuyerFilter` called `speakText(verdictMsg, false)` — `autoListenAfter` disabled so mic never reopened after verdict.
- **Fix & Guardrail Rule:** Post-discovery verdicts MUST use `speakText(msg, true)` unless user explicitly tapped Stop Voice.
- **Verification:** After property list verdict, mic reopens for site-visit interest or follow-up.

---

### 🔴 BUG 039: Voice Property Verdict Too Verbose & Site Visit Flow Misaligned
- **Reported Issue:** Agent read long price/BHK/locality strings aloud; site visit booking did not match user expectations.
- **Root Cause:** Verdict templates included full price and BHK strings; booking triggered before user picked a property.
- **Fix & Guardrail Rule:**
  1. Voice verdict: property **names only** + *"Have a look at the properties and let me know if you like any. I will book a site visit for you."*
  2. Booking starts only after user expresses interest; then run full interview (BUG 042).
- **Verification:** Voice lists names only; booking waits for user choice.

---

### 🔴 BUG 038: Post-Discovery State Reset Loop (Step 0 Rejection / Repetitive Listing Loop)
- **Reported Issue:** After the user answered all questionnaire questions, saying *"yes"*, *"book site visit"*, or asking follow-up questions caused the voice agent to either reject the query with *"We can't help you with this"* or repeat the property list again.
- **Root Cause:**
  1. `executeBuyerFilter` called `setBuyerStep(0)`, resetting the conversation state machine back to `Step 0` right after speaking the recommendations.
  2. When the user answered the closing prompt (*"would you like me to schedule a physical site visit?"*) by saying *"yes"* or *"book site visit"*, `Step 0` ran and failed to recognize `"yes"` as a rental intent query, falling through to the decline message (`"We can't help you with this..."`) or re-prompting for locality.
- **Fix & Guardrail Rule:**
  1. **Post-Discovery State Transition (`setBuyerStep(5)`):** Update `executeBuyerFilter` to transition `buyerStep` to `5` (Completed Post-Discovery Mode).
  2. **Step 5 Interactive Handlers:** Added explicit handlers in `handleProcessQuery` for `Step 5`:
     - **Site Visit Booking:** Recognizing *"yes"*, *"book"*, *"schedule"*, or property names opens the site visit booking calendar modal (`setBookingProperty`) and confirms assigned broker details.
     - **Spatial / Transit / POI / Safety Queries:** Responds with exact Namma Metro station distance or Karnataka Police crime telemetry.
     - **Dynamic Locality Searches:** Allows searching new localities seamlessly without resetting.
- **Verification:** Verified via Pytest evaluation suite (`python3 -m pytest tests/ -v` -> 18/18 passed) and live browser audio interaction.

---

### 🔴 BUG 037: Voice Agent Abrupt Conversation Ending & Speech Synthesis Sentence Truncation Bug
- **Reported Issue:** Voice Agent was stopping abruptly at the end of the conversation after asking all required questions, truncated trailing closing sentences, and used clunky/robotic phrasing (*"Here are a few suggested properties for you based on your criteria:"*).
- **Root Cause:**
  1. `speakText` in `src/App.jsx` used regex `text.match(/[^.!?]+[.!?]+/g)` to split sentences for Web Speech API synthesis. This regex ONLY matched text up to the last `.!?` punctuation mark, completely dropping and truncating any trailing sentences or closing questions that didn't end with explicit punctuation.
  2. Final verdict message called `speakText(verdictMsg, false)` with `autoListenAfter = false`, terminating the audio interaction state without maintaining voice loop continuity.
  3. `RAGPolicyEngine` and `App.jsx` verdict templates used repetitive, robotic text (*"Here are a few suggested properties for you based on your criteria:"*).
- **Fix & Guardrail Rule:**
  1. **Sentence Boundary Splitting:** Replaced regex-based sentence trimming with `cleanText.split(/(?<=[.!?])\s+/)` in `src/App.jsx`. Ensures 100% of the assistant's speech—including numbers, property names, and trailing closing questions—is queued and spoken to the very last word without any truncation.
  2. **Voice Continuity (`autoListenAfter`):** Updated `speakText(verdictMsg, true)` so that once the Voice Agent finishes speaking the final recommendation, the microphone automatically opens to receive the user's next voice command.
  3. **Polished Dialogue Ending:** Updated final verdict templates in `App.jsx` and `rag_policy_engine.py` to speak natural, conversational closing prompts:
     > *"I've curated [N] verified properties in [Locality] matching your preference for [Preferences], featuring [Top Matches]... Your property shortlist has been updated below — would you like me to schedule a physical site visit for any of these, or show you more details?"*
- **Verification:** Verified via Phase 2 verification script (`python3 scripts/run_phase2_verification.py`), Pytest evaluation suite (`python3 -m pytest tests/ -v` -> 18/18 passed), and live browser voice playback tests on `http://localhost:5173`.

---

### 🔴 BUG 036: 3 BHK Recommendation Leakage on 2 BHK Discovery & Step 0 Redundant Bedroom Prompt Loop
- **Reported Issue:** 3 BHK listings were appearing when a user requested 2 BHK on the platform (visible in recommended spotlight and property lists), and the voice agent was asking redundant questions without completing the conversation flow.
- **Root Cause:**
  1. `displayedListings` in `src/App.jsx` filtered `shortlist` only by locality and rental type, omitting `buyerData.bedrooms`. When `displayedListings` selected the spotlight recommended property (`displayedListings[0]`), a 3 BHK property appeared as recommended.
  2. `executeBuyerFilter` bedroom type check (`typeof data.bedrooms === 'number'`) failed on string numbers (e.g., `"2"`), bypassing bedroom filtering.
  3. `handleProcessQuery` (Step 0) intercepted queries with localities before checking if BHK was already specified, forcing the agent to ask *"How many bedrooms?"* repeatedly.
- **Fix & Guardrail Rule:**
  1. Enforce strict `buyerData.bedrooms` filtering in `displayedListings` memoized hook and handle multi-locality string inclusion.
  2. Parse bedroom values using `Number(data.bedrooms)` in `executeBuyerFilter` so string and numeric values filter identically.
  3. Update Step 0 in `handleProcessQuery` to detect BHK if present in initial query and skip redundant bedroom prompts.
  4. Pass `exact_bedrooms` to `filter_listings()` in `listings_db.py` and `dialogue_manager.py`.
- **Verification:** Verified via Vite production build (0 errors) and Phase 1, Phase 2, Phase 3, Phase 4, and Pytest verification suites (100% passed).

---

### 🔴 BUG 035: Non-Strict BHK Fallback Leakage (2BHK showing on 3BHK search) & Web Speech API Utterance Garbage Collection Cutoff
- **Reported Issue:** Searching for a 3BHK was showing 2BHK listings as well, and the voice agent stopped speaking mid-sentence without finishing the resolution message.
- **Root Cause:** `executeBuyerFilter` had a non-strict `if (bhkMatch.length > 0)` fallback that retained previous 2BHK listings when no 3BHK matched, and Chrome's V8 engine garbage collected unreferenced `SpeechSynthesisUtterance` instances mid-speech.
- **Fix & Guardrail Rule:**
  1. Strict BHK Hard Constraint: `filtered = filtered.filter(item => item.bedrooms === data.bedrooms)`. If zero 3BHK properties exist in that locality, it MUST report zero matches (`"No such property exists matching your criteria in [Locality]"`).
  2. Speech Utterance Garbage Collection Protection: Store `utterance` in `currentUtteranceRef.current` and delay `.speak()` by 50ms to prevent premature audio buffer truncation.
- **Verification:** Verified via Vite build (0 errors) and Phase 2 Intent Router & RAG Policy tests.

---

### 🔴 BUG 034: Penthouse Misclassification as 4BHK, Zero-Match Fallback Missing, and Link Schedule Verdict Phrasing
- **Reported Issue:** Asking for a penthouse resulted in *"Understood, 4 BHK in Bengaluru"*, missing matches defaulted to arbitrary 2BHK listings instead of explicitly reporting zero matches, and the final verdict phrasing missed the link schedule prompt.
- **Root Cause:** Penthouse input mapped directly to `bhk = 4` without distinct prompt handling, `executeBuyerFilter` lacked a 0-match fallback check, and final verdict phrasing used generic strings.
- **Fix & Guardrail Rule:**
  1. Distinct Penthouse recognition: Agent responds with *"Understood, a penthouse in [Locality]!"* without calling it a 4BHK.
  2. Zero Match Fallback: If 0 properties match the user's criteria (e.g. penthouse in locality with none), agent MUST speak *"No such property exists matching your criteria in [Locality]"* and show 0 listings.
  3. Link Schedule Verdict Phrasing: Final verdict MUST state:
     > *"Here are the listed properties for you. You can schedule a visit by clicking the link below."*
- **Verification:** Verified via Vite build (0 errors) and Phase 2 Intent Router & RAG Policy tests.

---

### 🔴 BUG 033: Single Locality Truncation on Multi-Locality Requests ("Koramangala and Indra Nagar") & Unclear Speech Repeat Fallback
- **Reported Issue:** Speaking multi-locality requests (*"I want to get in Koramangala and Indra Nagar"*) filtered for only one location instead of both, and unrecognized utterances caused the agent to stop responding without asking for clarification.
- **Root Cause:** `extractLocalityFromText` returned only the first matched locality string, `executeBuyerFilter` checked single locality equality, and interview steps lacked a non-blocking repeat prompt fallback.
- **Fix & Guardrail Rule:**
  1. Implement `extractLocalitiesFromText` to extract array of all requested localities (`['Koramangala', 'Indiranagar']`).
  2. Update `executeBuyerFilter` to filter properties matching ANY of the requested localities and state `"Koramangala & Indiranagar"`.
  3. Final verdict MUST explicitly state:
     > *"As per your requirements, here are your final listings in [localityDisplay] which you can explore and book a site visit by clicking the button below."*
  4. If an utterance is unparsed during discovery steps, agent MUST speak *"I didn't get that, can you please repeat?"* and keep continuous listening active.
- **Verification:** Verified via Vite build (0 errors) and Phase 2 Intent Router & RAG Policy tests.

---

### 🔴 BUG 032: Final Verdict Audio Speech Muted by Auto-Listen Trigger
- **Reported Issue:** At the end of the voice flow, the agent didn't speak out loud that these are the suggested properties.
- **Root Cause:** Chrome/Safari macOS muted `window.speechSynthesis` audio playback when `startListeningInternal()` was triggered concurrently via `autoListenAfter = true`. Additionally, browser audio context entered a suspended state without a `.resume()` guard.
- **Fix & Guardrail Rule:**
  1. Set `autoListenAfter = false` for final verdict speech so Chrome/Safari play the complete sentence out loud without mic interference.
  2. Add `window.speechSynthesis.resume()` safety check right after `.speak(utterance)`.
- **Verification:** Verified via Vite build (0 errors) and live browser audio playback tests.

---

### 🔴 BUG 031: Voice Agent Silence & Conversation Stall on "Fully Furnished House" Queries
- **Reported Issue:** Speaking *"I want a fully furnished house"* caused the voice agent to stop responding without completing the conversation or delivering the final property suggestions.
- **Root Cause:** Soft preference intercept triggered before step state progression, `furnishing` filter was missing from `executeBuyerFilter`, and final verdict phrasing lacked explicit completion message.
- **Fix & Guardrail Rule:**
  1. Add explicit `furnishing` filter (`Fully Furnished`, `Semi-Furnished`) to `executeBuyerFilter`.
  2. Enforce explicit completion phrase for all final verdicts:
     > *"As per your requirements, here are the suggested properties in [Locality] which you can explore and book a site visit by clicking the button below."*
  3. Ensure `speakText(verdictMsg, false)` always vocalizes out loud and keeps continuous voice listening active.
- **Verification:** Verified via Vite build (0 errors) and Phase 2 Intent Router & RAG Policy tests.

---

### 🔴 BUG 030: Decimal Indian Spoken Currency Parsing ("1.5 lakh") & Hospital Telemetry Priority
- **Reported Issue:** Spoken budget `"1.5 lakh"` parsed as `50,000` rupees, final verdict speech was muted, and asking for a hospital resulted in a metro station recommendation tag.
- **Root Cause:** `wordToNumberMap` had `'a': 1` which corrupted regex matching on `"a budget of 1.5 lakh"`, and `getRecommendationReason` checked `hasMetro` before `hasHospital`.
- **Fix & Guardrail Rule:** Pre-normalize `"1.5 lakh"`, `"one point five lakh"`, `"dedh lakh"` directly to `150,000 INR`. Make `hasHospital` **Priority 1** in `getRecommendationReason` mapping exact 24/7 hospitals per locality (St. John's, Manipal, Narayana).
- **Verification:** Passed exact currency conversion unit tests & hospital spatial telemetry tests.

---

### 🔴 BUG 029: Premature Search Resolution on Initial Rental Intent ("I want to rent an apartment")
- **Reported Issue:** Saying *"I want to rent an apartment"* caused the voice agent to stay silent or jump straight to final recommendations without asking for locality or BHK preferences.
- **Root Cause:** Soft preference intercept evaluated before `Step 0` because `"apartment"` was included in the soft preference terms list.
- **Fix & Guardrail Rule:** `Step 0` MUST evaluate before any soft preference intercept. Generic terms like `"apartment"` or `"flat"` in response to *"How should I help you today?"* MUST advance `buyerStep` to `1` and prompt: *"Which neighborhood or locality in Bengaluru do you prefer? (For example, Koramangala)"*.
- **Verification:** Passed sequential step machine state verification tests.

---

### 🔴 BUG 028: Scope Creep Handling (Buy / Non-Rent Queries) & Initial Greeting Standard
- **Reported Issue:** Agent needed to open with *"How should I help you today?"* and handle non-rental queries (buying, selling, commercial) with explicit decline message rather than attempting out-of-scope processing.
- **Root Cause:** Voice agent lacked explicit non-rent intent filtering and used variable initial greetings.
- **Fix & Guardrail Rule:** Initial greeting MUST be `"Welcome to Property Scout! How should I help you today?"`. If user specifies non-rental intent (buy, purchase, sell, commercial, plot, land), agent MUST decline with: *"We can't help you with this. Our platform currently specializes exclusively in verified rental property discovery in Bengaluru."*
- **Verification:** Passed intent classifier layer separation tests.

---

### 🔴 BUG 027: Permission Prompt Sequence Failure & Speech Recognition Freeze
- **Reported Issue:** Agent greeting played before browser microphone permission prompt appeared, causing speech recognition to freeze or stop responding.
- **Root Cause:** Audio playback triggered asynchronously before `getUserMedia` promise resolved.
- **Fix & Guardrail Rule:** `navigator.mediaDevices.getUserMedia({ audio: true })` MUST resolve successfully FIRST before playing vocal greetings or starting speech recognition.
- **Verification:** Passed browser Web Speech API & getUserMedia stream permission tests.
