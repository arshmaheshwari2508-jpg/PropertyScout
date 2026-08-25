# Voice-First AI Property Scout — Master Audit & Anti-Regression Bug Tracker (`issues.md`)

> **Master System Audit Record:** Comprehensive registry of all resolved user bugs, root causes, and strict engineering guardrail rules to prevent regressions.

---

## 📌 Master Resolved Bug Registry & Anti-Regression Directives

### 🔴 BUG 001: Automatic Audio Speech Repetition on Mode Switches & Initial Load
- **Reported Issue:** Voice agent speaks automatically whenever switching between Buyer and Seller modes or loading the page, irritating the user.
- **Root Cause:** `handlePersonaChange` and component initialization invoked `speakText()` unconditionally.
- **Fix & Guardrail Rule:** **Strict User-Triggered Audio Policy.** `speakText()` must ONLY be called when the user explicitly clicks the microphone button or clicks a voice action chip. Automatic audio on navigation or state change is strictly forbidden.

---

### 🔴 BUG 002: Fast & Robotic Computer Voice Synthesis
- **Reported Issue:** Voice sounded robotic, fast, and lagged.
- **Root Cause:** Browser Web Speech API default fallback voice ran at a fast default rate (`>1.05`).
- **Fix & Guardrail Rule:** Filter `window.speechSynthesis.getVoices()` for natural, sweet female voice models (`Google UK English Female`, `Google US English`, `Samantha`, `Karen`, `Victoria`). Set speech rate to `0.93` (calm human cadence) and pitch to `1.05` (warm tone).

---

### 🔴 BUG 003: Inability to Interrupt or Stop Agent Voice Output
- **Reported Issue:** Voice agent could not be interrupted or stopped while speaking.
- **Root Cause:** VoiceHUD lacked a direct `speechSynthesis.cancel()` trigger on active speech.
- **Fix & Guardrail Rule:** Add `onStopVoice()` and transform the main Mic button into a **Stop Button** (`Square` icon) with an **Interrupt Voice** badge whenever `isPlayingAudio` is active.

---

### 🔴 BUG 004: Seller Mode Showing Buyer Property Cards & Buyer Shortcuts
- **Reported Issue:** In Seller Mode, the app displayed buyer shortcuts (*"drop properties above 35k"*) and buyer search cards instead of seller tools.
- **Root Cause:** Renter & Seller modes shared the default buyer property card list component.
- **Fix & Guardrail Rule:** **Persona Workspace Isolation.** When `activePersona === 'Seller'`, the right workspace column MUST render `<SellerListingsWorkspace />` (seller earnings calculator, landlord benchmarks, active tenant leads, and listed properties) and HUD shortcuts MUST be 100% seller-centric.

---

### 🔴 BUG 005: Random Price Fallback Allocation & Unparsed Indian Currency Numbers (`80,00,000` / `4 Crores`)
- **Reported Issue:** Typing or stating `"4 crores"` or `"80,00,000"` resulted in random fallback numbers like `38k`.
- **Root Cause:** Regex parser failed to strip Indian comma formatting (`80,00,000`) and missed Indian currency scale terms (`Crore`, `Cr`, `Lakh`, `Lac`).
- **Fix & Guardrail Rule:** **No Random Money Fallbacks.** `parseIndianCurrencyStrict()` strips commas first, parses `Crores` (`*10000000`) and `Lakhs` (`*100000`). If price is missing or unparsed, return `null` and prompt the user: *"I didn't catch the exact price number. Could you please type your price in the text box below?"*

---

### 🔴 BUG 006: Conversational Interview Backtracking Loop
- **Reported Issue:** Agent asked questions but repeatedly backtracked to the first question (*"Which locality..."*).
- **Root Cause:** Query matching in `App.jsx` re-triggered Step 0 reset whenever the user response contained keywords like `"list"` or `"sell"`.
- **Fix & Guardrail Rule:** Enforce strict sequential state machine progression (`Step 1 ➔ 2 ➔ 3 ➔ 4 ➔ Publish`). Never re-trigger Step 0 unless the user explicitly requests `"cancel"` or `"reset"`.

---

### 🔴 BUG 007: Unstructured Buyer Mode Discovery Flow
- **Reported Issue:** Buyer mode was unstructured and did not guide the user through property discovery.
- **Root Cause:** Buyer mode immediately dumped raw listings without asking discovery questions.
- **Fix & Guardrail Rule:** Buyer mode MUST start with greeting *"Welcome to your AI Property Scout! How can I help you find your dream property today?"*, guide through discovery questions (Rent vs Buy ➔ Locality ➔ Budget ➔ BHK), and then display tailored recommendations!

---

### 🔴 BUG 008: Technical RAG & Anti-Hallucination Jargon in User UI
- **Reported Issue:** User expressed strong dislike for technical RAG terms ("4-layer RAG", "anti-hallucination", "architecture spec") in the customer-facing interface.
- **Root Cause:** Developer spec tabs and architecture badges were rendered in the end-user navigation header and landing page.
- **Fix & Guardrail Rule:** **Clean Customer UI Policy.** Remove all RAG architecture tabs and technical badges from user-facing components. Use clear, professional real estate terminology (*"Verified Listings Only"*, *"AI Property Agent"*).

---

### 🔴 BUG 009: Redundant Role Switch Buttons on Workspace Page
- **Reported Issue:** Selecting "Buyer" on the home page still showed confusing Buyer/Seller toggle buttons in the header bar on the second page.
- **Root Cause:** `HeaderNav.jsx` rendered duplicate persona switch tabs even when the user was already inside the active persona workspace.
- **Fix & Guardrail Rule:** Display a single clean role badge (`🟢 Buyer & Tenant Mode`) with a simple `Switch` button that returns to the home page gateway.

---

### 🔴 BUG 010: Hidden Photo Upload Dropzone
- **Reported Issue:** User could not find or see the flat photo upload section on the seller intake form.
- **Root Cause:** Photo uploader was buried at the bottom of a long form.
- **Fix & Guardrail Rule:** **Top Photo Dropzone Placement.** Photo uploader MUST be placed at the absolute top of the Seller Hub as a prominent dedicated tab with instant drag & drop preview.

---

### 🔴 BUG 011: Agent Asking Redundant Question when Intent Already Stated ("I want to buy a house")
- **Reported Issue:** User said *"I want to buy a house"*, but agent asked *"Are you looking to Rent or Buy?"*.
- **Root Cause:** State machine forced Step 1 question even if initial query contained explicit purchase intent.
- **Fix & Guardrail Rule:** **Smart Intent Extraction.** If user explicitly states `"buy"` / `"purchase"` / `"house"` in their first query, automatically set `listingType: 'sale'` and skip straight to Step 2 (Locality).

---

### 🔴 BUG 012: Spoken Word Number Parsing ("one crore" / "fifty lakhs")
- **Reported Issue:** Saying or typing `"one crore"` or `"fifty lakhs"` failed budget parsing and repeatedly asked user to re-enter budget.
- **Root Cause:** Currency parser only matched numeric digits (`1 crore`), failing on spoken English/Hindi word numbers (`one`, `two`, `fifty`, `ek`, `do`).
- **Fix & Guardrail Rule:** **Bilingual Word-to-Digit Pre-parsing.** `parseIndianCurrencyStrict()` maps spoken word numbers (`one` ➔ `1`, `fifty` ➔ `50`) before running scale multiplication.

---

### 🔴 BUG 013: Multi-word Spoken Locality Mis-matching ("Indra Nagar" ➔ "Koramangala")
- **Reported Issue:** Saying *"Indra Nagar"* resulted in agent responding *"Got it, Koramangala!"*.
- **Root Cause:** String matcher checked exact continuous string `indiranagar`, failing on speech-to-text transcriptions like `"indra nagar"` or `"indira nagar"`.
- **Fix & Guardrail Rule:** **Phonetic Locality Normalization.** `extractLocalityFromText()` matches all common STT spelling variants (`indira nagar`, `indra nagar`, `kora mangala`, `white field`, `hsr`).

---

### 🔴 BUG 014: Tapping Mic Button Repeatedly & Missing Hands-free Voice Activity Detection (VAD)
- **Reported Issue:** User had to press the speak button repeatedly after every response.
- **Root Cause:** Voice synthesis `utterance.onend` did not automatically restart speech recognition.
- **Fix & Guardrail Rule:** **Continuous Conversational Mode.** When `speakText` finishes speaking a response, automatically restart `SpeechRecognition` so the user can speak hands-free without pressing the microphone button again.

---

### 🔴 BUG 015: Page Shifting / Moving Downwards Upon Speaking
- **Reported Issue:** The entire web application tab moved downwards every time a user finished speaking.
- **Root Cause:** `chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })` was scrolling the outer browser window element instead of the inner chat log box.
- **Fix & Guardrail Rule:** **Container-Scoped Scroll Isolation.** Replace `scrollIntoView()` with `chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight` scoped strictly inside the chat box container element.

---

### 🔴 BUG 016: Missing Property Cards Output Upon Search Completion
- **Reported Issue:** Completing the interview resulted in 0 properties showing up on the right column.
- **Root Cause:** `executeBuyerFilter` filtered strictly against exact BHK/Price limits without fallbacks, showing an empty list.
- **Fix & Guardrail Rule:** **Smart Property Matcher Fallback.** Upon interview completion, update `shortlist` state with verified matching properties. If 0 items match strict limits, automatically return the closest verified properties in that target locality (e.g. Indiranagar 2BHK/3BHK) so the user always sees real property results!

---

### 🔴 BUG 017: Redundant Budget Denomination Phrasing ("crores, lakhs or rupees")
- **Reported Issue:** Voice agent asked *"What is your budget in Rupees, Lakhs, or Crores?"*, which felt repetitive since Crores and Lakhs are denominations of Rupee.
- **Root Cause:** Hardcoded text string in Step 2 prompt.
- **Fix & Guardrail Rule:** **Clean Real Estate Phrasing.** Simplify budget prompt to *"What is your target budget?"*.

---

### 🔴 BUG 018: Missing Family Needs & Lifestyle Preference Interview Step (`list.md`)
- **Reported Issue:** Chatbot did not ask about family size or specific amenities (schools, hospitals, senior citizen accessibility, pet friendly).
- **Root Cause:** Interview flow ended prematurely after asking for BHK without checking family lifestyle requirements.
- **Fix & Guardrail Rule:** **Family Matrix Alignment (`list.md`).** Integrate Step 5 into the interview flow: *"How many family members will be living with you, and do you have specific requirements like nearby top schools, hospital proximity, or metro walking distance?"*.

---

### 🔴 BUG 019: Conversational State Machine Looping on Budget Answer ("Two crore rupees")
- **Reported Issue:** Stating `"Two crore rupees"` triggered repeated prompt: *"Got it, Indiranagar! What is your target budget?"*.
- **Root Cause:** Non-atomic React state updates allowed `buyerStep` to evaluate to `1` or `2` repeatedly during asynchronous state updates.
- **Fix & Guardrail Rule:** **Atomic Ref-backed State Machine.** Track state transitions with explicit step counters (`buyerStepRef.current`) that advance atomically to Bedrooms (Step 3) and Family Needs (Step 4), preventing loops.

---

### 🔴 BUG 020: Missing Prominent Voice Activity Detection (VAD) Visual Bar
- **Reported Issue:** User could not see visual VAD status while speaking.
- **Root Cause:** VAD state was only rendered as a text badge inside the header.
- **Fix & Guardrail Rule:** **Prominent VAD Indicator Bar.** Render a dedicated, full-width VAD audio status bar with animated waveform pulse bars above the chat box (`VOICE ACTIVITY DETECTION (VAD): LISTENING FOR USER SPEECH...` vs `AGENT SPEAKING RESPONSE...`).

---

### 🔴 BUG 021: Missing Real Apartment Photos on Property Cards
- **Reported Issue:** Property cards lacked real high-resolution apartment images.
- **Root Cause:** Card component rendered plain text specs without image banners.
- **Fix & Guardrail Rule:** **Real Estate Photo Banners.** Render high-definition apartment photo banners with expandable photo gallery modal view on all property cards.

---

### 🔴 BUG 022: Technical VAD Banner Jargon in Customer UI
- **Reported Issue:** User requested removal of technical VAD text banners from the screen while keeping background voice recognition.
- **Root Cause:** Visual banner displayed technical acronym "VAD".
- **Fix & Guardrail Rule:** **Clean Customer UX.** Remove technical VAD banners from the UI view while maintaining continuous background voice activity recognition.

---

### 🔴 BUG 023: Welcome Greeting Missing on Microphone Click
- **Reported Issue:** Tapping the microphone button to start the session did not speak the welcome greeting out loud.
- **Root Cause:** The vocal greeting was only triggered on header switcher changes, not on microphone activation.
- **Fix & Guardrail Rule:** **Mic Greeting Trigger.** When the microphone button is clicked at the beginning of a conversation, immediately trigger `speakText()` to vocalize the welcome greeting.

---

### 🔴 BUG 024: Visible Raw Chat Log / Transcription Clutter
- **Reported Issue:** User expressed that seeing the entire transcript history by default cluttered the Voice-First UI.
- **Root Cause:** Chat transcript history box was rendered on the screen at all times.
- **Fix & Guardrail Rule:** **Collapsible Chat Log.** Hide the transcript history box by default. Provide a prominent toggle button (**"Show Chat History & Transcription"** / **"Hide Chat History"**) so users only see the logs if they explicitly expand them.

---

### 🔴 BUG 025: Voice Agent Silence / Interruption on Soft Preference Queries ("I want a pet friendly side your apartment")
- **Reported Issue:** Speaking queries containing soft preferences (*"I want a pet friendly side your apartment"*) caused the agent to stop asking questions or fail to deliver a response/verdict.
- **Root Cause:** `isSoftPrefQuery` missed STT variations of `pet`, `pet friendly`, `apartment`, `flat`, `side`, and `friendly`, falling through step 0 without executing search.
- **Fix & Guardrail Rule:** **Comprehensive Soft Preference Intercept.** Soft preferences (`pet`, `pet friendly`, `hospital`, `metro`, `school`, `gym`, `park`, `balcony`, `furnished`, `apartment`) MUST be intercepted at any step. `executeBuyerFilter` MUST execute search, update shortlist, and speak the final verdict: *"Here are some suggestions for you which you can explore and book a site visit by clicking the link below."*

---

### 🔴 BUG 026: Hallucinated Stock Property Photos & Item Count Clutter
- **Reported Issue:** Property cards displayed random Unsplash photos of houses/villas that were not real photos of the actual listing, and scout header displayed item counts like `(148)`.
- **Root Cause:** Image error fallback inserted arbitrary Unsplash stock URLs when owner photos were missing, and header title appended `(${displayedListings.length})`.
- **Fix & Guardrail Rule:** **Classy Non-Hallucinatory Dark Theme Placeholder.** If owner-verified photos are not uploaded, display a classy dark-theme architectural placeholder banner (`Verified Listing Details • 📷 No Photos Uploaded by Owner`) instead of hallucinating fake property photos. Remove `(148)` item counts from Scout header.

---

### 🔴 BUG 027: Permission Prompt Sequence Failure & Speech Recognition Freeze
- **Reported Issue:** Agent greeting played before browser microphone permission prompt appeared, causing speech recognition to freeze or stop responding.
- **Root Cause:** Audio playback triggered asynchronously before `getUserMedia` promise resolved.
- **Fix & Guardrail Rule:** **Permission-First Microphone Request.** `navigator.mediaDevices.getUserMedia({ audio: true })` MUST resolve successfully FIRST before playing vocal greetings or starting speech recognition.

---

### 🔴 BUG 028: Scope Creep Handling (Buy / Non-Rent Queries) & Initial Greeting Standard
- **Reported Issue:** User asked agent to open with *"How should I help you today?"* and handle non-rental queries (buying, selling, commercial) with explicit decline message rather than attempting out-of-scope processing.
- **Root Cause:** Voice agent lacked explicit non-rent intent filtering and used variable initial greetings.
- **Fix & Guardrail Rule:** **Strict Rental Scope Policy.** Initial greeting MUST be `"Welcome to Property Scout! How should I help you today?"`. If user specifies non-rental intent (buy, purchase, sell, commercial, plot, land), agent MUST decline with: *"We can't help you with this. Our platform currently specializes exclusively in verified rental property discovery in Bengaluru."*

---

### 🔴 BUG 029: Premature Search Resolution on Initial Rental Intent ("I want to rent an apartment")
- **Reported Issue:** Saying *"I want to rent an apartment"* caused the voice agent to stay silent or jump straight to final recommendations without asking for locality or BHK preferences.
- **Root Cause:** Soft preference intercept evaluated before `Step 0` because `"apartment"` was included in the soft preference terms list, bypassing the discovery sequence and calling `executeBuyerFilter` with `autoListenAfter = false`.
- **Fix & Guardrail Rule:** **Sequential Step 0 Precedence.** `Step 0` MUST evaluate before any soft preference intercept. Generic terms like `"apartment"` or `"flat"` in response to *"How should I help you today?"* MUST advance `buyerStep` to `1` and prompt: *"Which neighborhood or locality in Bengaluru do you prefer? (For example, Koramangala)"* with continuous voice listening enabled.

---

### 🔴 BUG 030: Decimal Indian Spoken Currency Parsing ("1.5 lakh") & Hospital Telemetry Recommendation Priority
- **Reported Issue:** Spoken budget `"1.5 lakh"` parsed as `50,000` rupees, final verdict speech was muted or silent, and asking for a hospital resulted in a metro station recommendation.
- **Root Cause:** `wordToNumberMap` had `'a': 1` which corrupted regex matching on `"a budget of 1.5 lakh"`, `speakText` ran with `autoListenAfter = false`, and `getRecommendationReason` checked `hasMetro` before `hasHospital`.
- **Fix & Guardrail Rule:** **Indian Decimal Currency Normalization & Hospital Recommendation Priority.** Pre-normalize `"1.5 lakh"`, `"one point five lakh"`, `"dedh lakh"` directly to `150,000 INR`. Make `hasHospital` **Priority 1** in `getRecommendationReason` mapping exact 24/7 hospitals per locality (St. John's, Manipal, Narayana). Ensure final verdict vocalizes: *"Here are some selected properties in [Locality] matching your requirements..."* with active speech enabled.

---

### 🔴 BUG 031: Voice Agent Silence & Conversation Stall on "Fully Furnished House" Queries
- **Reported Issue:** Speaking *"I want a fully furnished house"* caused the voice agent to stop responding without completing the conversation or delivering the final property suggestions.
- **Root Cause:** Soft preference intercept triggered before step state progression, `furnishing` filter was missing from `executeBuyerFilter`, and final verdict phrasing lacked explicit completion message.
- **Fix & Guardrail Rule:**
  1. Add explicit `furnishing` filter (`Fully Furnished`, `Semi-Furnished`) to `executeBuyerFilter`.
  2. Enforce explicit completion phrase for all final verdicts:
     > *"As per your requirements, here are the suggested properties in [Locality] which you can explore and book a site visit by clicking the button below."*
  3. Ensure `speakText(verdictMsg, false)` always vocalizes out loud and keeps continuous voice listening active.

---

### 🔴 BUG 032: Final Verdict Audio Speech Muted by Auto-Listen Trigger
- **Reported Issue:** At the end of the voice flow, the agent didn't speak out loud that these are the suggested properties.
- **Root Cause:** Chrome/Safari macOS muted `window.speechSynthesis` audio playback when `startListeningInternal()` was triggered concurrently via `autoListenAfter = true`. Additionally, browser audio context entered a suspended state without a `.resume()` guard.
- **Fix & Guardrail Rule:**
  1. Set `autoListenAfter = false` for final verdict speech so Chrome/Safari play the complete sentence out loud without mic interference.
  2. Add `window.speechSynthesis.resume()` safety check right after `.speak(utterance)`.

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

---

### 🔴 BUG 034: Penthouse Misclassification as 4BHK, Zero-Match Fallback Missing, and Link Schedule Verdict Phrasing
- **Reported Issue:** Asking for a penthouse resulted in *"Understood, 4 BHK in Bengaluru"*, missing matches defaulted to arbitrary 2BHK listings instead of explicitly reporting zero matches, and the final verdict phrasing missed the link schedule prompt.
- **Root Cause:** Penthouse input mapped directly to `bhk = 4` without distinct prompt handling, `executeBuyerFilter` lacked a 0-match fallback check, and final verdict phrasing used generic strings.
- **Fix & Guardrail Rule:**
  1. Distinct Penthouse recognition: Agent responds with *"Understood, a penthouse in [Locality]!"* without calling it a 4BHK.
  2. Zero Match Fallback: If 0 properties match the user's criteria (e.g. penthouse in locality with none), agent MUST speak *"No such property exists matching your criteria in [Locality]"* and show 0 listings.
  3. Link Schedule Verdict Phrasing: Final verdict MUST state:
     > *"Here are the listed properties for you. You can schedule a visit by clicking the link below."*

---

### 🔴 BUG 035: Non-Strict BHK Fallback Leakage (2BHK showing on 3BHK search) & Web Speech API Utterance Garbage Collection Cutoff
- **Reported Issue:** Searching for a 3BHK was showing 2BHK listings as well, and the voice agent stopped speaking mid-sentence without finishing the resolution message.
- **Root Cause:** `executeBuyerFilter` had a non-strict `if (bhkMatch.length > 0)` fallback that retained previous 2BHK listings when no 3BHK matched, and Chrome's V8 engine garbage collected unreferenced `SpeechSynthesisUtterance` instances mid-speech.
- **Fix & Guardrail Rule:**
  1. Strict BHK Hard Constraint: `filtered = filtered.filter(item => item.bedrooms === data.bedrooms)`. If zero 3BHK properties exist in that locality, it MUST report zero matches (`"No such property exists matching your criteria in [Locality]"`).
  2. Speech Utterance Garbage Collection Protection: Store `utterance` in `currentUtteranceRef.current` and delay `.speak()` by 50ms to prevent premature audio buffer truncation.
