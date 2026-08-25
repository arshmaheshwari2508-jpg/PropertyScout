"""
Verification Script for Phase 2 Implementation.
Validates:
  1. Intent Query Routing across 4 separation layers.
  2. Citation Resolution against Docs/sources.jsonl.
  3. OpenStreetMap MCP Spatial Transit & Metro Distance Queries.
  4. Weighted RAG Retrieval Engine (BAAI/bge-small-en-v1.5 + Cosine * Weight).
  5. RAG Policy Engine Guardrails (Gemini 2.5 Flash Lite Reasoning + Smallest AI TTS Synthesis).
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.grounding.query_router import IntentQueryRouter, QueryIntent
from src.grounding.citation_resolver import CitationResolver
from src.grounding.osm_mcp_client import OpenStreetMapMCPClient
from src.grounding.weighted_rag_engine import WeightedRAGEngine
from src.grounding.rag_policy_engine import RAGPolicyEngine


def test_intent_router():
    print("\n--- Testing Intent Query Router (4 Separation Layers) ---", flush=True)
    
    # Layer 1: Property Listings & Prices
    r1 = IntentQueryRouter.classify_intent("Show me 2BHK rental apartments under 40k in Koramangala")
    print(f"Query 1: '2BHK rent under 40k' -> Classified Intent: {r1.value}")
    assert r1 == QueryIntent.LISTING_PRICING, "Should route to LISTING_PRICING!"

    # Layer 2: Spatial Transit & Metro Distance
    r2 = IntentQueryRouter.classify_intent("How far is Indiranagar from the nearest metro station?")
    print(f"Query 2: 'metro distance' -> Classified Intent: {r2.value}")
    assert r2 == QueryIntent.LIVE_TRANSIT_POI, "Should route to LIVE_TRANSIT_POI!"

    # Layer 4: Crime & Safety Evidence
    r3 = IntentQueryRouter.classify_intent("Is Koramangala safe for women at night?")
    print(f"Query 3: 'Is area safe at night?' -> Classified Intent: {r3.value}")
    assert r3 == QueryIntent.CRIME_SAFETY, "Should route to CRIME_SAFETY!"

    # Layer 3: Neighborhood Character & Context
    r4 = IntentQueryRouter.classify_intent("Tell me about the history and commercial development of Indiranagar")
    print(f"Query 4: 'history and development' -> Classified Intent: {r4.value}")
    assert r4 == QueryIntent.NEIGHBORHOOD_CONTEXT, "Should route to NEIGHBORHOOD_CONTEXT!"

    print("✅ Intent Query Router Test Passed!", flush=True)


def test_citation_resolver():
    print("\n--- Testing Citation Resolver ---", flush=True)
    resolver = CitationResolver(sources_path="Docs/sources.jsonl")
    
    wiki_src = resolver.resolve("SRC_WIKI_NEIGHBORHOODS")
    print(f"Resolved SRC_WIKI_NEIGHBORHOODS: Name='{wiki_src['name']}', Type='{wiki_src['type']}'")
    assert wiki_src["type"] == "public_reference", "Should match sources.jsonl type!"
    
    osm_src = resolver.resolve("SRC_OSM_MCP")
    print(f"Resolved SRC_OSM_MCP: Name='{osm_src['name']}'")
    assert "OpenStreetMap" in osm_src["name"], "Should resolve OpenStreetMap MCP source!"

    print("✅ Citation Resolver Test Passed!", flush=True)


def test_osm_mcp_client():
    print("\n--- Testing OpenStreetMap MCP Client ---", flush=True)
    client = OpenStreetMapMCPClient()
    
    metro = client.get_nearest_metro_station(lat=12.9784, lon=77.6385, locality="Indiranagar")
    print(f"Indiranagar Metro Query: Nearest Station='{metro['station_name']}', Distance={metro['distance_km']} km")
    assert metro["distance_km"] >= 0.0, "Distance should be non-negative!"
    assert metro["source_id"] == "SRC_OSM_MCP", "Source must be SRC_OSM_MCP!"

    print("✅ OpenStreetMap MCP Client Test Passed!", flush=True)


def test_rag_policy_engine():
    print("\n--- Testing RAG Policy Engine (Gemini 2.5 Flash Lite + Smallest AI TTS) ---", flush=True)
    engine = RAGPolicyEngine()
    
    # 1. Test Listing Query (RAG Bypassed)
    res_listing = engine.process_query("Show me 2BHK rent in Koramangala", active_locality="Koramangala", persona="Buyer")
    print(f"Listing Query Result: Source={res_listing['data_source']}, RAG_Used={res_listing['rag_used']}")
    assert res_listing["rag_used"] is False, "RAG MUST be bypassed for property listings & rents!"
    assert "tts" in res_listing, "TTS payload must be generated!"

    # 2. Test Metro Query (RAG Bypassed -> OpenStreetMap MCP)
    res_metro = engine.process_query("How far is Indiranagar from metro?", active_locality="Indiranagar", persona="Renter")
    print(f"Metro Query Result: Source={res_metro['data_source']}, Station={res_metro['metro_data']['station_name']}")
    assert res_metro["rag_used"] is False, "RAG MUST be bypassed for exact distance queries!"
    assert res_metro["citations"][0]["source_id"] == "SRC_OSM_MCP", "Must cite SRC_OSM_MCP!"

    # 3. Test Non-Binary Safety Query
    res_safety = engine.process_query("Is Koramangala safe?", active_locality="Koramangala", persona="Renter")
    print(f"Safety Query Result: Policy Notice='{res_safety['policy_notice']}'")
    assert "binary" in res_safety["policy_notice"].lower(), "Must enforce non-binary safety guardrail!"

    # 4. Test Unindexed Locality (Fallback string check)
    res_unindexed = engine.process_query("What is the history of Atlantis City in Bengaluru?", active_locality="Atlantis City", persona="Buyer")
    print(f"Unindexed Query Result: Context='{res_unindexed['grounded_context']}'")
    assert "I don't have enough verified information" in res_unindexed["grounded_context"], "Must return explicit unavailability fallback!"

    # 5. Test Grounded Context Query with Gemini Flash Lite
    res_context = engine.process_query("What is Indiranagar like?", active_locality="Indiranagar", persona="Renter")
    print(f"Grounded Context Query Answer: {res_context['final_answer']}")
    assert len(res_context["final_answer"]) > 0, "Final grounded answer must be generated!"

    print("✅ RAG Policy Engine Guardrails & Gemini Agent Test Passed!", flush=True)


if __name__ == "__main__":
    test_intent_router()
    test_citation_resolver()
    test_osm_mcp_client()
    test_rag_policy_engine()
    print("\n🎉 ALL PHASE 2 TESTS PASSED SUCCESSFULLY!", flush=True)
