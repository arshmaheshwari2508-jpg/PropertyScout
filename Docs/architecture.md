# Voice-First AI Property Scout — System Architecture & Technical Design Document

> **Version:** 1.3.0  
> **Status:** Architecture Blueprint & Technical Specification  
> **Source Reference:** [Docs/problemstatement.md](file:///Users/arshmaheshwari/Final%20Graduation%20Project%20Property/Docs/problemstatement.md)

---

## 📋 Executive Summary

The **Voice-First AI Property Scout** is an intelligent conversational real estate platform tailored for the Bengaluru rental and home-buying market. Unlike traditional property aggregators that rely on rigid search filters and unverified metadata, this solution provides a **voice-driven, multi-persona, contextual, and evidence-grounded experience**, complete with comprehensive platform information (About Us, How It Works, FAQs, Help & Support).

Key differentiators include:
1. **Multi-Persona UI Workspace & Header Navigation:** Top navigation featuring branding, main persona workspace tabs (*Buyer, Renter, Seller/Broker*), and dedicated informational views (*About Us, How It Works, FAQs, Help*).
2. **Conversational Property Onboarding for Sellers/Brokers:** Automated voice & UI intake capturing property location, asking price/rent, BHK, sqft, furnishing, and a **Seller Property Review/Highlights note**.
3. **Weighted RAG Grounding (Seller Bias Mitigation):** Ingests seller-provided property notes into the RAG vector store for amenity discovery, while applying **lower retrieval weightage (Weight: 0.3)** compared to independent sources (Weight: 1.0) like OpenStreetMap MCP and Wikipedia.
4. **Scraped & PII-Cleaned Real Listings:** Data directly sourced from `bengaluru.rent` and property portals, pre-filtered for active listings with all PII (owner/agent phone numbers and names) strictly sanitized.
5. **Structured Spatial Grounding (OpenStreetMap MCP):** Real-time spatial query integration via OpenStreetMap MCP server for verified proximity calculation (transit, amenities, POIs).
6. **n8n PDF & Email Automation:** Automated post-booking workflow compiling personalized shortlist reports into PDFs and delivering them via email.
7. **Automated AI Evaluation Suite:** Comprehensive, runnable evaluations covering Feasibility, Seller Intake & Persona Correctness, and Grounding/Bias Mitigation.

---

## 📐 System Architecture Overview

The system employs a modular, decoupled architecture consisting of **7 core layers**:

```mermaid
graph TD
    subgraph UI ["Companion UI Layer (Client)"]
        UI_Nav["Top Navigation Bar (Logo, Persona Tabs, Info Links)"]
        UI_Persona["Persona Workspace Tabs (Buyer vs Renter vs Seller/Broker)"]
        UI_Info["Informational Views (About Us, FAQs, Help, How It Works)"]
        UI_Voice["Voice Interface & Real-time Transcript"]
        UI_SellerIntake["Seller Property Intake Panel & Review Field"]
        UI_Cards["Shortlist Cards Panel"]
        UI_Neigh["Neighborhood Snapshot Panel"]
        UI_Sources["Sources & Citations Panel"]
        UI_Visit["Visit Confirmation Panel"]
    end

    subgraph Audio ["Voice Processing Pipeline"]
        STT["Speech-to-Text (STT) Engine"]
        TTS["Text-to-Speech (TTS) Engine"]
        VAD["Voice Activity Detection (VAD)"]
    end

    subgraph Agent ["AI Orchestration & Dialogue Engine"]
        DM["Multi-Role Dialogue & Intake Manager"]
        DeltaEngine["Targeted Shortlist Delta Engine"]
        Reasoning["Reasoning & Weighted Explanation Module"]
    end

    subgraph Grounding ["Grounding & Integration Layer"]
        OSM_MCP["OpenStreetMap MCP Server (Weight 1.0)"]
        RAG["Weighted RAG Engine (Vector DB)"]
    end

    subgraph Data ["Data Storage & Ingestion"]
        Scraper["bengaluru.rent Scraper"]
        PII_Filter["PII Redaction Pipeline"]
        PropDB["Property Listings Database (Rent, Sale & User-Added)"]
        VectorDB["Neighborhood Knowledge & Weighted Seller Notes"]
    end

    subgraph Automation ["Workflow & Automation Layer"]
        n8n["n8n Workflow Engine"]
        PDFGen["PDF Report Generator"]
        MailService["SMTP / Email Service"]
    end

    subgraph Eval ["AI Evaluation Suite"]
        Eval_Feas["Feasibility Evaluator"]
        Eval_Intake["Seller Intake & Persona Evaluator"]
        Eval_Ground["Grounding & Seller Bias Mitigation Evaluator"]
    end

    %% Interactions
    UI_Nav --> UI_Persona
    UI_Nav --> UI_Info
    UI_Persona -->|Set Mode: Buyer / Renter / Seller| DM
    UI_SellerIntake -->|Submit Property & Seller Notes| PropDB
    UI_SellerIntake -->|Ingest Seller Notes (Weight 0.3)| VectorDB
    UI_Voice -->|Audio Stream / Websocket| STT
    STT -->|Transcribed Text| DM
    DM -->|State Update| DeltaEngine
    DeltaEngine -->|Query Active Listings| PropDB
    DeltaEngine -->|Spatial Query| OSM_MCP
    Reasoning -->|Context Retrieval| RAG
    RAG -->|Read Knowledge & Seller Notes| VectorDB
    OSM_MCP -->|POIs & Transit| UI_Neigh
    DM -->|Response Text| TTS
    TTS -->|Audio Feedback| UI_Voice
    
    DeltaEngine -->|Updated Shortlist| UI_Cards
    Reasoning -->|Citations & Weighted Rationale| UI_Sources

    UI_Visit -->|Book Visit Event| n8n
    n8n --> PDFGen
    PDFGen --> MailService
```

---

## 🏛️ Component Architecture & Deep-Dive Specifications

### 1. Companion UI Dashboard & Navigation (Frontend)

* **Top Header Bar & Navigation:**
  * Branding logo + Title (*Voice-First AI Property Scout*).
  * **Persona Workspace Tabs:** `Buyer`, `Renter`, `Seller / Landlord / Broker`.
  * **Informational Links & Modals:**
    * **About Us:** Platform mission, zero-hallucination architecture, OpenStreetMap MCP integration, PII security.
    * **How It Works:** 4-step interactive onboarding diagram (Select Role → Speak Preferences → Review Shortlist & Snapshot → Book & Receive Email PDF).
    * **FAQs:** Accordion section addressing PII protection, RAG citation grounding, voice edit syntax, and seller note weighting.
    * **Help & Support:** Voice command cheat-sheet (*"Show 2BHKs near Indiranagar metro"*, *"Drop above 40k"*), microphone test utility, and support contact form.
* **Seller Property Intake Panel (Seller Mode Active):**
  * Interactive Form & Voice Intake UI for landlords/brokers with a multiline **Seller Property Review & Highlights Box**.
* **Shortlist Cards, Neighborhood Snapshot & Citations Panels:**
  * Active listing cards, spatial transit metrics (via OpenStreetMap MCP), and source citations.
