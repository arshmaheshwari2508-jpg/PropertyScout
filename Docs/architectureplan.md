# Voice-First AI Property Scout — Technical Architecture & Implementation Plan

> **Version:** 2.3.0 (Master Architecture Plan with Gemini 2.5 Flash/Lite & Smallest AI Stack)  
> **Status:** Approved Technical Design Blueprint  
> **Source Grounding:** [Docs/problemstatement.md](file:///Users/arshmaheshwari/Final%20Graduation%20Project%20Property/Docs/problemstatement.md) & [gemini.md](file:///Users/arshmaheshwari/Final%20Graduation%20Project%20Property/gemini.md)

---

## 1. Executive Summary & Vision

The **Voice-First AI Property Scout** is a multi-persona, evidence-grounded real estate intelligence platform built for the Bengaluru property market. Unlike conventional portals that force users through rigid dropdown filters and unverified metadata, this solution provides:

1. **Multi-Role Persona Switching:** Dynamically shifts AI dialogue state, input forms, financial calculations, and search rules across three user roles: **Buyer**, **Renter**, and **Seller / Landlord / Broker**.
2. **Strict Separation of Responsibilities across 4 Data Engines:**
   - **`bengaluru.rent`**: Current listings, rent prices, and availability. (Never queried from RAG).
   - **`RAG Knowledge Store` (`localities.jsonl`, `sources.jsonl`, `Readme.md`)**: Verified neighborhood history, character, development, and context.
   - **`Safety Evidence Engine` (`safety_sources.jsonl`)**: Crime stats with strict non-binary safety handling.
   - **`OpenStreetMap MCP`**: Real-time spatial POI, transit, metro station, and distance calculations.
3. **Primary Voice & AI Model Architecture:**
   - **Voice Input (STT):** **Gemini 2.5 Flash** (Multimodal native audio input for fast, high-accuracy speech transcription).
   - **LLM Reasoning Engine:** **Gemini 2.5 Flash Lite** (High-speed, cost-efficient reasoning & grounded response generation).
   - **Voice Output (TTS):** **Smallest AI** (Waves / Lightning API — ultra-low latency <100ms speech synthesis).
   - **Embedding Model:** **`BAAI/bge-small-en-v1.5`** (384-dimensional dense vectors via FastEmbed running 100% free locally in <5ms).
4. **n8n PDF & Email Automation:** Automated post-booking workflow compiling personalized shortlist reports into PDFs and delivering them via email.

---

## 2. High-Level Architecture & Separation Matrix

```mermaid
graph TD
    subgraph UI ["Companion UI Layer (Client Dashboard)"]
        UI_Nav["Top Navigation Bar (Logo, Persona Tabs, Info Links)"]
        UI_Persona["Persona Workspace Tabs (Buyer vs Renter vs Seller/Broker)"]
        UI_Info["Informational Modals (About Us, How It Works, FAQs, Help)"]
        UI_Voice["Voice Interface & Real-time Transcript"]
        UI_SellerIntake["Seller Property Intake Panel & Review Field"]
        UI_Cards["Shortlist Cards Panel (Rent, Sale & Seller Badges)"]
        UI_Neigh["Neighborhood Snapshot Panel (OSM Transit & POIs)"]
        UI_Sources["Sources & Citations Panel (Mapped to sources.jsonl)"]
        UI_Visit["Visit Confirmation Panel"]
    end

    subgraph Audio ["Voice Processing Layer"]
        STT["Gemini 2.5 Flash (Voice STT Input)"]
        TTS["Smallest AI (Waves / Lightning TTS Output)"]
        VAD["Voice Activity Detection (WebRTC VAD)"]
    end

    subgraph Orchestrator ["AI Orchestration & Gemini Engine"]
        GeminiLLM["Gemini 2.5 Flash Lite (LLM Reasoning Engine)"]
        PolicyEngine["RAG Policy & Separation Guardrail Engine"]
        DeltaEngine["Targeted Shortlist Delta Engine"]
    end

    subgraph Separation ["4-Layer Data Separation Architecture"]
        DB_Listings["bengaluru.rent DB<br>(Active Listings & Rents)"]
        OSM_MCP["OpenStreetMap MCP Server<br>(Live Transit & POI Distances)"]
        RAG_Store["ChromaDB Vector Store<br>(bge-small-en-v1.5 Embeddings)"]
        Safety_Store["Safety Evidence Store<br>(safety_sources.jsonl)"]
    end

    subgraph Automation ["Automation & Workflow Layer"]
        n8n["n8n Workflow Engine"]
        PDFGen["PDF Renderer Node"]
        MailService["SMTP / Email Dispatcher"]
    end

    %% Query Routing Logic
    UI_Voice -->|Audio Stream| VAD
    VAD --> STT
    STT -->|Transcript| GeminiLLM
    
    GeminiLLM --> PolicyEngine
    PolicyEngine -->|"Listing / Pricing Query"| DB_Listings
    PolicyEngine -->|"Metro / Distance / POI Query"| OSM_MCP
    PolicyEngine -->|"Locality / History / Guidance"| RAG_Store
    PolicyEngine -->|"Crime / Safety Query"| Safety_Store
    
    OSM_MCP -->|POIs & Distance Matrix| UI_Neigh
    RAG_Store -->|Context & Source Metadata| UI_Sources
    DB_Listings -->|Active Listings| UI_Cards
    
    GeminiLLM -->|Response Text| TTS
    TTS -->|Audio Output| UI_Voice
    
    UI_Visit -->|Trigger Site Visit Event| n8n
    n8n --> PDFGen
    PDFGen --> MailService
```

---

## 3. Technology Stack Specification

| Component | Technology Choice | Function / Purpose |
| :--- | :--- | :--- |
| **Voice Input (STT)** | **Gemini 2.5 Flash** | Multimodal audio speech-to-text transcription |
| **LLM Reasoning** | **Gemini 2.5 Flash Lite** | Fast, grounded dialogue & JSON response generation |
| **Voice Output (TTS)** | **Smallest AI** (Lightning API) | Ultra-low latency (<100ms) natural speech synthesis |
| **Embedding Engine** | **`BAAI/bge-small-en-v1.5`** (FastEmbed) | 384-dim local dense vector embeddings (<5ms) |
| **Vector DB** | **ChromaDB** | Local persistent vector storage (`./data/chroma_db`) |
| **Spatial MCP** | **OpenStreetMap MCP** | Real-time transit, POIs, and metro distances |
| **Automation** | **n8n Workflow Engine** | PDF generation and email delivery (`site_visit_pdf_workflow.json`) |
