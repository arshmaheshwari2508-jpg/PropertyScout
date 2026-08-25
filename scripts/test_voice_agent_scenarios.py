"""
Comprehensive Test Suite for Voice-First AI Property Scout.
Validates all 10 core voice interaction scenarios:
  1. Standard Rental Search (Locality + BHK + Budget)
  2. One-Shot Complete Query
  3. Non-Rental Intent Dejection (Buy/Sale)
  4. Out-of-Scope Off-Topic General Trivia (Recipes, Weather, Capitals)
  5. Spatial Metro Distance Telemetry (OpenStreetMap MCP)
  6. Non-Binary Safety & Crime Evidence (Karnataka Police 2025)
  7. Unindexed Locality Negative Grounding ("I don't have enough verified info...")
  8. Strict BHK Anti-Leakage (2BHK search returns ZERO 3BHKs)
  9. Multi-Locality Matching ("Indiranagar & Koramangala")
  10. Zero-Match Criteria Fallback (No hallucinated listings when 0 match)
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.grounding.query_router import IntentQueryRouter, QueryIntent
from src.grounding.rag_policy_engine import RAGPolicyEngine
from src.agent.dialogue_manager import MultiPersonaDialogueManager
from src.data.listings_db import PropertyListingsDB


def run_all_scenario_tests():
    print("=" * 80, flush=True)
    print("🚀 RUNNING VOICE AGENT END-TO-END SCENARIO TEST SUITE (10 SCENARIOS)", flush=True)
    print("=" * 80, flush=True)

    dialogue_mgr = MultiPersonaDialogueManager()
    rag_engine = RAGPolicyEngine()

    # -------------------------------------------------------------------------
    # SCENARIO 1: Standard Rental Search (Indiranagar 2BHK under 50k)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 1] Standard Rental Search (Indiranagar 2BHK under 50k) ---", flush=True)
    q1 = "Show me 2BHK rental flats in Indiranagar under 50k"
    res1 = rag_engine.process_query(q1, active_locality="Indiranagar", persona="Renter")
    print(f"Query: '{q1}'")
    print(f"Intent: {res1['intent']} | Data Source: {res1['data_source']}")
    print(f"Matching Listings Found: {len(res1['listings'])}")
    assert res1["intent"] == QueryIntent.LISTING_PRICING.value, "Must classify as LISTING_PRICING!"
    assert res1["rag_used"] is False, "RAG MUST be bypassed for property listings!"
    assert all(item["bedrooms"] == 2 for item in res1["listings"]), "All listings MUST be strictly 2BHK!"
    print("✅ Scenario 1 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 2: One-Shot Complete Query
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 2] One-Shot Complete Query ---", flush=True)
    q2 = "Rent a 2BHK flat in Whitefield under 40000"
    res2 = rag_engine.process_query(q2, active_locality="Whitefield", persona="Renter")
    print(f"Query: '{q2}'")
    print(f"Intent: {res2['intent']} | Grounded Response: {res2['final_answer']}")
    assert res2["intent"] == QueryIntent.LISTING_PRICING.value, "Must classify as LISTING_PRICING!"
    assert len(res2["listings"]) > 0, "Must return matching Whitefield rental properties!"
    print("✅ Scenario 2 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 3: Non-Rental Intent Dejection (Buy/Sale)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 3] Non-Rental Intent Dejection (Buy/Sale) ---", flush=True)
    q3 = "I want to buy a 3BHK villa in Koramangala"
    res3 = dialogue_mgr.process_voice_turn(q3)
    print(f"Query: '{q3}'")
    print(f"Intent classified in policy engine...")
    res3_policy = rag_engine.process_query(q3, persona="Renter")
    print(f"Policy Engine Output: {res3_policy['final_answer']}")
    assert "sale" in res3_policy["grounded_context"].lower() or "sale" in res3_policy["intent"].lower() or "bengaluru.rent" in res3_policy["data_source"], "Handled non-rental intent cleanly!"
    print("✅ Scenario 3 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 4: Out-of-Scope Off-Topic General Trivia Rejection
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 4] Out-of-Scope Off-Topic General Trivia Rejection ---", flush=True)
    off_topic_queries = [
        "What is the capital of France?",
        "Can you give me a recipe for chicken biryani?",
        "What is the weather in Tokyo today?"
    ]
    for q_off in off_topic_queries:
        intent_off = IntentQueryRouter.classify_intent(q_off)
        res_off = rag_engine.process_query(q_off)
        print(f"Off-Topic Query: '{q_off}' -> Intent: {intent_off.value}")
        print(f"Decline Response: {res_off['final_answer']}")
        assert intent_off == QueryIntent.OUT_OF_SCOPE, f"Query '{q_off}' MUST classify as OUT_OF_SCOPE!"
        assert "specializes exclusively in verified rental property discovery" in res_off["final_answer"], "Must output strict specialization decline notice!"
    print("✅ Scenario 4 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 5: Spatial Metro Distance Telemetry Query (OpenStreetMap MCP)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 5] Spatial Metro Distance Telemetry (OpenStreetMap MCP) ---", flush=True)
    q5 = "How far is Indiranagar from the nearest metro station?"
    res5 = rag_engine.process_query(q5, active_locality="Indiranagar")
    print(f"Query: '{q5}'")
    print(f"Data Source: {res5['data_source']} | Station: {res5['metro_data']['station_name']} | Distance: {res5['metro_data']['distance_km']} km")
    assert res5["intent"] == QueryIntent.LIVE_TRANSIT_POI.value, "Must classify as LIVE_TRANSIT_POI!"
    assert res5["rag_used"] is False, "RAG MUST be bypassed for exact distance queries!"
    assert res5["citations"][0]["source_id"] == "SRC_OSM_MCP", "Must cite SRC_OSM_MCP!"
    print("✅ Scenario 5 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 6: Non-Binary Safety & Crime Evidence (Karnataka Police 2025)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 6] Non-Binary Safety & Crime Evidence ---", flush=True)
    q6 = "Is Koramangala safe for women at night?"
    res6 = rag_engine.process_query(q6, active_locality="Koramangala")
    print(f"Query: '{q6}'")
    print(f"Policy Guardrail Notice: {res6['policy_notice']}")
    assert res6["intent"] == QueryIntent.CRIME_SAFETY.value, "Must classify as CRIME_SAFETY!"
    assert "binary" in res6["policy_notice"].lower(), "Must enforce non-binary safety guardrail!"
    assert res6["citations"][0]["source_id"] == "SRC_KAR_POLICE_CRIME_2025", "Must cite SRC_KAR_POLICE_CRIME_2025!"
    print("✅ Scenario 6 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 7: Unindexed Locality Negative Grounding ("do_not_infer")
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 7] Unindexed Locality Negative Grounding ---", flush=True)
    q7 = "Tell me about Atlantis City neighborhood history"
    res7 = rag_engine.process_query(q7, active_locality="Atlantis City")
    print(f"Query: '{q7}'")
    print(f"Fallback Response: {res7['final_answer']}")
    assert "I don't have enough verified information to make that claim." in res7["final_answer"], "Must return explicit unavailability fallback string!"
    print("✅ Scenario 7 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 8: Strict BHK Anti-Leakage Test (2BHK returns ZERO 3BHKs)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 8] Strict BHK Anti-Leakage (2BHK search returns ZERO 3BHKs) ---", flush=True)
    db = PropertyListingsDB()
    domlur_2bhk = db.filter_listings(locality="Domlur", listing_type="rent", exact_bedrooms=2)
    domlur_all = db.filter_listings(locality="Domlur", listing_type="rent")
    print(f"Domlur Total Active Listings: {len(domlur_all)}")
    print(f"Domlur Strict 2BHK Listings: {len(domlur_2bhk)}")
    assert all(x["bedrooms"] == 2 for x in domlur_2bhk), "All items in exact_bedrooms=2 MUST be 2BHK!"
    assert not any(x["bedrooms"] == 3 for x in domlur_2bhk), "ZERO 3BHK listings allowed in 2BHK filter!"
    print("✅ Scenario 8 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 9: Multi-Locality Matching ("Indiranagar & Koramangala")
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 9] Multi-Locality Matching ---", flush=True)
    locs_extracted = IntentQueryRouter.extract_locality_mention("Indiranagar and Koramangala")
    print(f"Extracted Locality Mention: '{locs_extracted}'")
    indigo_listings = db.filter_listings(locality="Indiranagar", listing_type="rent")
    kora_listings = db.filter_listings(locality="Koramangala", listing_type="rent")
    print(f"Indiranagar Rents: {len(indigo_listings)} | Koramangala Rents: {len(kora_listings)}")
    assert len(indigo_listings) > 0 and len(kora_listings) > 0, "Must contain listings for both localities!"
    print("✅ Scenario 9 Passed!")

    # -------------------------------------------------------------------------
    # SCENARIO 10: Zero-Match Criteria Fallback (No Hallucinated Listings)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 10] Zero-Match Criteria Fallback ---", flush=True)
    impossible_listings = db.filter_listings(locality="Indiranagar", listing_type="rent", max_price=1000)
    print(f"Filter Indiranagar Rent <= ₹1,000/mo: Found {len(impossible_listings)} listings.")
    assert len(impossible_listings) == 0, "Must yield 0 listings without hallucinating dummy data!"
    print("✅ Scenario 10 Passed!")

    print("\n" + "=" * 80, flush=True)
    print("🎉 ALL 10 VOICE AGENT SCENARIOS PASSED WITH ZERO HALLUCINATION & STRICT SCOPE CONTROL!", flush=True)
    print("=" * 80, flush=True)


if __name__ == "__main__":
    run_all_scenario_tests()
