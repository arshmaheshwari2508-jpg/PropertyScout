"""
Pytest Scenario Evaluation Suite for Voice-First AI Property Scout.
Tests all 10 end-to-end voice agent interaction scenarios:
  - Scope rejection for off-topic queries (recipes, weather, politics)
  - Strict BHK filtering (no 3BHK leak on 2BHK queries)
  - Zero hallucination (verified DB, OSM MCP, empirical crime statistics)
"""

import pytest
from src.grounding.query_router import IntentQueryRouter, QueryIntent
from src.grounding.rag_policy_engine import RAGPolicyEngine
from src.data.listings_db import PropertyListingsDB


class TestVoiceAgentScenarios:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.rag_engine = RAGPolicyEngine()
        self.db = PropertyListingsDB()

    def test_scenario_1_standard_rental_search(self):
        q = "Show me 2BHK rental flats in Indiranagar under 50k"
        res = self.rag_engine.process_query(q, active_locality="Indiranagar", persona="Renter")
        assert res["intent"] == QueryIntent.LISTING_PRICING.value
        assert res["rag_used"] is False
        assert len(res["listings"]) > 0
        assert all(item["bedrooms"] == 2 for item in res["listings"])

    def test_scenario_2_one_shot_complete_query(self):
        q = "Rent a 2BHK flat in Whitefield under 90000"
        res = self.rag_engine.process_query(q, active_locality="Whitefield", persona="Renter")
        assert res["intent"] == QueryIntent.LISTING_PRICING.value
        assert len(res["listings"]) > 0

    def test_scenario_3_non_rental_purchase_intent_declined(self):
        q = "I want to buy a 3BHK villa in Koramangala"
        res = self.rag_engine.process_query(q, persona="Renter")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value
        assert "rental property discovery" in res["final_answer"].lower()
        assert len(res["listings"]) == 0

    def test_scenario_4_out_of_scope_off_topic_rejection(self):
        off_topic_queries = [
            "What is the capital of France?",
            "Can you give me a recipe for chicken biryani?",
            "What is the weather in Tokyo today?"
        ]
        for q in off_topic_queries:
            intent = IntentQueryRouter.classify_intent(q)
            res = self.rag_engine.process_query(q)
            assert intent == QueryIntent.OUT_OF_SCOPE
            assert "specializes exclusively in verified rental property discovery" in res["final_answer"]

    def test_scenario_5_spatial_metro_distance_mcp(self):
        q = "How far is Indiranagar from the nearest metro station?"
        res = self.rag_engine.process_query(q, active_locality="Indiranagar")
        assert res["intent"] == QueryIntent.LIVE_TRANSIT_POI.value
        assert res["rag_used"] is False
        assert res["citations"][0]["source_id"] == "SRC_OSM_MCP"
        assert res["metro_data"]["distance_km"] >= 0.0

    def test_scenario_6_non_binary_safety_evidence(self):
        q = "Is Koramangala safe for women at night?"
        res = self.rag_engine.process_query(q, active_locality="Koramangala")
        assert res["intent"] == QueryIntent.CRIME_SAFETY.value
        assert "binary" in res["policy_notice"].lower()
        assert res["citations"][0]["source_id"] == "SRC_KAR_POLICE_CRIME_2025"

    def test_scenario_7_unindexed_locality_negative_grounding(self):
        q = "Tell me about Atlantis City neighborhood history"
        res = self.rag_engine.process_query(q, active_locality="Atlantis City")
        assert "I don't have enough verified information to make that claim." in res["final_answer"]

    def test_scenario_8_strict_bhk_anti_leakage(self):
        domlur_2bhk = self.db.filter_listings(locality="Domlur", listing_type="rent", exact_bedrooms=2)
        assert len(domlur_2bhk) > 0
        assert all(x["bedrooms"] == 2 for x in domlur_2bhk)
        assert not any(x["bedrooms"] == 3 for x in domlur_2bhk)

    def test_scenario_9_multi_locality_matching(self):
        indigo = self.db.filter_listings(locality="Indiranagar", listing_type="rent")
        kora = self.db.filter_listings(locality="Koramangala", listing_type="rent")
        assert len(indigo) > 0 and len(kora) > 0

    def test_scenario_10_zero_match_criteria_fallback(self):
        zero_match = self.db.filter_listings(locality="Indiranagar", listing_type="rent", max_price=1000)
        assert len(zero_match) == 0

    def test_bhk_verdict_and_failure_phrasing_regression(self):
        """Regression test for BHK response phrasing (success and failure cases)."""
        # Success case
        res_success = self.rag_engine.process_query("Find 2BHK rental in Indiranagar under 50000", active_locality="Indiranagar")
        assert "Here are the suggested properties for you:" in res_success["final_answer"]

        # Failure case (unrealistic budget of 1000 INR)
        res_fail = self.rag_engine.process_query("Find 2BHK rental in Indiranagar under 1000", active_locality="Indiranagar")
        assert "Sorry, no properties found" in res_fail["final_answer"]

    def test_locality_context_metro_requirement_regression(self):
        """Regression test for locality context preserving active locality (Indiranagar) instead of hardcoding Koramangala."""
        res_metro = self.rag_engine.process_query("What is the nearest metro station?", active_locality="Indiranagar")
        assert "Indiranagar" in res_metro["final_answer"]
        assert "Koramangala" not in res_metro["final_answer"]
        assert "Indiranagar Metro Station" in res_metro["final_answer"]
