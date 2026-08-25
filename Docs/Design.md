# SCOUT.AI — Comprehensive Design System & Architecture Specification

> **Project Name:** Voice-First Real Estate Grounding Engine for Bengaluru  
> **Version:** 2.3  
> **Target Platform:** Desktop & Mobile Web (React 18+, TypeScript, Tailwind CSS, FastEmbed RAG, OpenStreetMap MCP, n8n Automation)

---

## 1. System Architecture & 4-Layer Separation Matrix

To ensure absolute factual reliability and prevent model hallucination in real estate intelligence, SCOUT.AI enforces strict mathematical separation across four dedicated knowledge and dynamic data layers. Cross-locality inference and ungrounded speculation are strictly prohibited.

+-----------------------------------------------------------------------------------+
| VOICE HUD & LIVE QUERY DISPATCH |
+-----------------------------------------+-----------------------------------------+
|
[Query Routing & Entity Classifier]
|
+-------------------+----------------+------------------+-------------------+
| | | |
+----+----+ +----+----+ +----+----+ +----+----+
| Layer 1 | | Layer 2 | | Layer 3 | | Layer 4 |
+----+----+ +----+----+ +----+----+ +----+----+
| bengaluru.rent | localities.jsonl | safety_sources | OpenStreetMap MCP |
| (Dynamic Catalog) | (Historical / Urban Context) | (Empirical Audit) | (Spatial Network) |
| | | | |
| - Asking Prices | - 5-Yr Appreciation CAGR | - Lighting Index | - Metro Distance |
| - Rent / Deposit | - Rental Yield Estimates | - Patrol Freq. | - Walking Time |
| - BHK / Sq.Ft. | - Cultural & Sector History | - Police Distance | - Tech Park Drive |
| - RERA Certs | - Demographics & Masterplans | - Night Footfall | - POI Coordinates |
+---------+---------+---------+-------------------------+---------+---------+---------+---------+
| | | |
+-------------------+-----------------+-----------------+-------------------+
|
[Grounded Context Assembler]
|
[Gemini 2.5 Flash Synthesis]
|
[Audited Response + Citation Links]

### Layer Separation Rules
1. **Dynamic Catalog (`bengaluru.rent`)**: Indexed via 384-dimensional FastEmbed (`bge-small-en-v1.5`). Queries concerning pricing, floor space, availability, and developer delivery records route exclusively here.
2. **Locality Knowledge (`localities.jsonl`)**: Curated municipal gazettes and urban planning records. Used for long-term appreciation trends, macro infrastructure developments, and cultural character.
3. **Safety Telemetry (`safety_sources.jsonl`)**: Strict non-binary safety policy. The engine never emits binary "safe/unsafe" assertions. It presents audited empirical evidence (street illumination percentage, patrol beat frequency, distance to jurisdictional police stations).
4. **Spatial Geometry (`OpenStreetMap MCP`)**: Coordinate routing for isochrones, true walking distances to Namma Metro lines, and road commute matrices to tech corridors (Outer Ring Road, Whitefield, Electronic City).

---

## 2. Visual Design Archetypes (Multi-Theme System)

SCOUT.AI provides 4 distinct aesthetic themes switchable in real time:

### Theme 1: Architect Obsidian (Default)
- **Atmosphere:** Deep cosmic midnight blueprint with laser telemetry contours.
- **Canvas:** `#070B12` (Base) with subtle 36px architectural grid (`rgba(255, 255, 255, 0.02)`).
- **Accents:** Emerald (`#10B981`), Laser Cyan (`#06B6D4`), Slate Blue (`#1E293B`).
- **Use Case:** High-density command center for multi-metric property exploration.

### Theme 2: Editorial Luxury Gold
- **Atmosphere:** Warm charcoal and burnished champagne gold inspired by bespoke architectural journals.
- **Canvas:** `#0D1117` with warm ambient gold radial gradients (`rgba(212, 175, 55, 0.12)`).
- **Accents:** Champagne Gold (`#D4AF37`), Amber Bronze (`#B45309`), Warm Slate (`#1C222C`).
- **Typography:** High-contrast Playfair Display display headings paired with refined body text.

### Theme 3: Cadastral Daylight
- **Atmosphere:** Clean architectural drafting parchment with forest green ink.
- **Canvas:** `#F4F6F9` with fine 32px cadastral grid lines (`rgba(15, 23, 42, 0.035)`).
- **Accents:** Forest Emerald (`#047857`), Cadet Blue (`#0284C7`), Deep Slate Ink (`#0F172A`).
- **Use Case:** High-clarity daylight drafting and printed dossier previews.

### Theme 4: Spatial Cyber Tactical HUD
- **Atmosphere:** Military-grade spatial telemetry HUD with glowing neon vectors.
- **Canvas:** `#030712` with cyan/violet coordinate scanlines.
- **Accents:** Electric Cyan (`#00F2FF`), Hyper Violet (`#A855F7`), Laser Pink (`#EC4899`).
- **Use Case:** Immersive spatial routing and live transit track exploration.

---

## 3. UI Component Hierarchy & Layout Modes

SCOUT.AI provides 4 primary responsive layout modes:

[ App Root (App.tsx) ]
├── [ Header Navigation (Header.tsx) ]
│ ├── Brand Masthead & Editorial Logo
│ ├── Quick Locality Dropdown (Koramangala, Indiranagar, Whitefield, etc.)
│ ├── Multi-Theme Switcher (Obsidian / Luxury Gold / Daylight / Cyber)
│ ├── Multi-Persona Role Switcher (Buyer / Renter / Seller)
│ └── Layout View Selector (Command / Spatial Map / Compare / Design Spec)
│
├── [ Main Workspace Viewport ]
│ ├── Mode A: Command View (Split Voice HUD + Workspace Cards + Telemetry)
│ │ ├── Left: Voice Agent HUD & Transcripts (VoiceHUD.tsx)
│ │ ├── Left: Neighborhood Telemetry Radar (NeighborhoodTelemetry.tsx)
│ │ └── Right: Buyer / Renter / Seller Workspaces (PropertyCard.tsx)
│ │
│ ├── Mode B: Spatial GIS Radar Map (SpatialRadarMap.tsx)
│ │ ├── Interactive Bengaluru Locality Coordinate Grid
│ │ ├── Namma Metro Purple & Green Line Tracks & Stations
│ │ ├── Tech Corridor Arcs (ORR, Hosur Rd) & 500m/1.5km Isochrones
│ │ ├── Safety Illumination Heat Zones
│ │ └── Property Marker Pins with Floating Scout Dossier
│ │
│ ├── Mode C: Property Comparison Matrix (PropertyComparisonMatrix.tsx)
│ │ ├── Multi-Property shortlisting (up to 3 simultaneous)
│ │ ├── Metric-by-metric evaluation table
│ │ └── "Best Value" & "Nearest Metro" badge highlights
│ │
│ └── Mode D: Design System Showcase (DesignSystemShowcase.tsx)
│ ├── 4-Layer RAG Separation Matrix Explorer
│ ├── Color Token & Contrast Swatches
│ ├── Typography Scale & Specimen
│ ├── Interactive Gemini Voice Waveform States
│ └── n8n Automation Engine Pipeline
│
├── [ Drawers & Modals ]
│ ├── SourcesDrawer.tsx (Full citation inspection with RERA IDs & reliability scores)
│ ├── BookingModal.tsx (Site visit scheduling & automated n8n PDF generation)
│ ├── AboutModal.tsx, HowItWorksModal.tsx, FaqModal.tsx, HelpModal.tsx
│
└── [ Footer Telemetry Bar ]

---

## 4. Multi-Persona Role Design Specifications

### 1. Buyer Mode (Amber Gold `#F59E0B`)
- **Primary Metrics:** Total Asking Price (₹ Lakhs/Crores), Price per Sq.Ft., 5-Year Capital Appreciation CAGR, Karnataka RERA ID & Occupancy Certificate status.
- **Actions:** Request RERA verification dossier, inspect builder delivery track record, calculate loan EMI projections.

### 2. Renter Mode (Sapphire Blue `#3B82F6`)
- **Primary Metrics:** Monthly Rent (₹/month), Security Deposit, Minimum Lock-in Period (months), Maintenance Fee, Immediate Move-in Availability.
- **Actions:** Filter by furnishing status (Fully/Semi/Unfurnished), check walking time to nearest metro station, verify power backup.

### 3. Seller / Broker Mode (Rose Quartz `#F43F5E`)
- **Primary Features:** Real-time voice property intake parsing (BHK, asking price, sub-area).
- **Grounding Integrity:** Multiline Seller Notes are ingested and explicitly tagged with `[Seller Note - 0.3 weight]` to differentiate vendor statements from verified government gazettes.

---

## 5. Automated n8n Post-Visit Workflow Pipeline
[User Clicks "Schedule Site Visit"]
│
▼
[Payload Construction: propertyId, slotDate, slotTime, userEmail, userName]
│
▼
[n8n Webhook: /webhook/site-visit-dispatch]
│
┌───────┴───────┐
▼ ▼
[Query OSM Geometries] [Fetch RERA Certificates]
└───────┬───────┘
▼
[n8n HTML-to-PDF Renderer Node]

Generates 2-Page Tailored Scout Dossier

Embeds Metro Isochrone Map & Safety Audit Excerpt
│
┌───────┴───────┐
▼ ▼
[SMTP Node] [Telegram/SMS Webhook]

Dispatches - Alerts Developer
PDF to user Property Host

---

## 6. Accessibility & Contrast Verification

- **Body Text Minimum:** 14px (`0.875rem`) with line-height 1.6 on high-contrast backgrounds.
- **Color Contrast:** All text tokens adhere to WCAG AA standards (minimum 4.5:1 for body copy and 3.0:1 for large display headers).
- **Tabular Figures:** All prices, distances, and citation identifiers use monospaced fonts (`JetBrains Mono` / `font-mono`) to prevent alignment jitter during real-time updates.