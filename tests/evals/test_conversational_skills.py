"""
End-to-End Conversational Skills Evaluation Test Suite for Voice-First AI Property Scout.

Evaluates:
  1. Multi-Persona Workspace Switching (Renter vs Buyer vs Seller/Broker).
  2. Intent Routing & 4-Layer Separation (Listings, OSM MCP, RAG, Safety).
  3. Non-Binary Safety Policy Guardrails & Citation Resolution.
  4. Negative Grounding Fallback ("I don't have enough verified information...").
  5. Voice Shortlist Delta Commands ("drop properties above 40k").
  6. Seller Property Intake with 0.3 Weighted RAG Ingestion.
  7. 8-Broker Collision Avoidance Algorithm & Site Visit Scheduling.
"""

import pytest
import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.agent.dialogue_manager import MultiPersonaDialogueManager, PersonaRole
from src.grounding.query_router import IntentQueryRouter, QueryIntent
from src.grounding.citation_resolver import CitationResolver
from src.grounding.osm_mcp_client import OpenStreetMapMCPClient
from src.grounding.rag_policy_engine import RAGPolicyEngine
from src.agent.delta_engine import ShortlistDeltaEngine
from src.data.broker_booking_db import BrokerBookingDB
from src.data.pii_scrubber import sanitize_listing


class TestConversationalSkills:

    @pytest.fixture(autouse=True)
    def setup_manager(self):
        self.manager = MultiPersonaDialogueManager()

    def test_persona_switching_skills(self):
        """Validates dynamic persona workspace switching and context state."""
        assert self.manager.current_persona == PersonaRole.RENTER
        
        # Switch to Buyer
        res_buyer = self.manager.switch_persona("Switch to Buyer Mode")
        assert self.manager.current_persona == PersonaRole.BUYER
        assert "Buyer Mode" in res_buyer["final_answer"]
        
        # Switch to Seller
        res_seller = self.manager.switch_persona("Switch to Seller Mode")
        assert self.manager.current_persona == PersonaRole.SELLER_BROKER
        assert "Seller & Broker" in res_seller["final_answer"]

        # Switch back to Renter
        res_renter = self.manager.switch_persona("Switch back to Renter Mode")
        assert self.manager.current_persona == PersonaRole.RENTER
        assert "Renter Mode" in res_renter["final_answer"]

    def test_4_layer_intent_routing(self):
        """Validates that 4 distinct intent categories are correctly routed."""
        # Layer 1: Property Listings & Rent
        q1 = IntentQueryRouter.classify_intent("Find me 2BHK rental options in Koramangala under 35k")
        assert q1 == QueryIntent.LISTING_PRICING

        # Layer 2: Spatial Transit & Metro POI
        q2 = IntentQueryRouter.classify_intent("What is the nearest metro station to Indiranagar?")
        assert q2 == QueryIntent.LIVE_TRANSIT_POI

        # Layer 3: Context & Neighborhood Character
        q3 = IntentQueryRouter.classify_intent("What is the lifestyle and history of Indiranagar?")
        assert q3 == QueryIntent.NEIGHBORHOOD_CONTEXT

        # Layer 4: Crime Statistics & Safety Evidence
        q4 = IntentQueryRouter.classify_intent("How safe is HSR Layout at night?")
        assert q4 == QueryIntent.CRIME_SAFETY

    def test_negative_grounding_unindexed_locality(self):
        """Enforces negative grounding explicit fallback string when context is unindexed."""
        engine = RAGPolicyEngine()
        res = engine.process_query(
            user_query="Tell me about Atlantis City neighborhood",
            active_locality="Atlantis City",
            persona="Renter"
        )
        assert "I don't have enough verified information to make that claim." in res["grounded_context"]

    def test_non_binary_safety_guardrail(self):
        """Enforces non-binary safety guardrail outputting empirical evidence notice."""
        engine = RAGPolicyEngine()
        res = engine.process_query(
            user_query="Is Koramangala safe?",
            active_locality="Koramangala",
            persona="Renter"
        )
        assert "policy_notice" in res
        assert "binary" in res["policy_notice"].lower()

    def test_osm_mcp_spatial_grounding(self):
        """Validates OpenStreetMap MCP station distance resolution."""
        client = OpenStreetMapMCPClient()
        metro = client.get_nearest_metro_station(lat=12.9784, lon=77.6385, locality="Indiranagar")
        assert metro["station_name"] == "Indiranagar Metro Station"
        assert metro["source_id"] == "SRC_OSM_MCP"

    def test_shortlist_delta_voice_edits(self):
        """Validates conversational shortlist voice delta editing."""
        seed_shortlist = [
            {"listing_id": "p1", "locality": "Koramangala", "rent_inr": 32000},
            {"listing_id": "p2", "locality": "Koramangala", "rent_inr": 45000},
            {"listing_id": "p3", "locality": "Indiranagar", "rent_inr": 38000},
        ]
        kept, delta = ShortlistDeltaEngine.apply_delta(seed_shortlist, "drop properties above 40k")
        assert len(kept) == 2
        assert delta["removed_ids"] == ["p2"]

    def test_seller_property_intake_and_pii_scrubbing(self):
        """Validates seller intake, PII redaction, and 0.3 weighted RAG review ingestion."""
        self.manager.switch_persona("Seller Mode")
        res = self.manager.process_seller_intake(
            property_title="Palace View Villa",
            locality="Whitefield",
            price_inr=15000000,
            bedrooms=4,
            sqft=2800,
            seller_review_notes="Direct owner John Doe contact at 9876543210. Close to ITPL with private terrace."
        )
        assert res["status"] == "seller_intake_success"
        assert res["seller_rag_weight"] == 0.3
        assert "owner_name" not in res["listing"]
        assert "[REDACTED_PHONE]" in res["listing"]["description"]

    def test_8_broker_collision_avoidance_algorithm(self, tmp_path):
        """Validates 8-broker collision avoidance logic under concurrent slot exhaustion."""
        test_db_path = str(tmp_path / "eval_scout_bookings.db")
        db = BrokerBookingDB(db_path=test_db_path)
        visit_date = "2026-09-15"
        slot = "02:00 PM - 03:00 PM"

        assigned_brokers = set()
        for i in range(1, 9):
            res = db.book_site_visit(
                user_name=f"Evaluator #{i}",
                user_email=f"eval{i}@example.com",
                phone=f"+91 990000000{i}",
                visit_date=visit_date,
                time_slot=slot,
                property_title=f"Sample Flat #{i}",
                locality="Indiranagar"
            )
            assert res["success"] is True
            assigned_brokers.add(res["broker"]["id"])

        assert len(assigned_brokers) == 8

        # 9th booking must fail cleanly
        res_9th = db.book_site_visit(
            user_name="Evaluator #9 (Overflow)",
            user_email="eval9@example.com",
            phone="+91 9900000009",
            visit_date=visit_date,
            time_slot=slot,
            property_title="Overflow Flat",
            locality="Indiranagar"
        )
        assert res_9th["success"] is False
        assert res_9th["error"] == "ALL_BROKERS_BUSY"
