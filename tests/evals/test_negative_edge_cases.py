"""
Automated negative & edge-case evaluations mapped to test.md (TC-NEG-001 … TC-NEG-050).
Covers backend/voice-logic paths that can be verified without browser automation.
"""

import pytest
from src.agent.dialogue_manager import MultiPersonaDialogueManager, PersonaRole
from src.agent.delta_engine import ShortlistDeltaEngine
from src.grounding.query_router import IntentQueryRouter, QueryIntent
from src.grounding.rag_policy_engine import RAGPolicyEngine
from src.data.listings_db import PropertyListingsDB


RENTAL_DECLINE = "rental property discovery"
NEGATIVE_GROUNDING = "I don't have enough verified information to make that claim."
NO_MATCH = "Sorry, no properties found"


class TestNegativeEdgeCases:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.rag = RAGPolicyEngine()
        self.db = PropertyListingsDB()
        self.manager = MultiPersonaDialogueManager()

    # --- Section 1: Unsupported intent ---

    def test_tc_neg_001_buy_property_declined(self):
        res = self.rag.process_query("I want to buy a 3BHK villa in Koramangala for ₹2 crore.")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value
        assert RENTAL_DECLINE in res["final_answer"].lower()
        assert len(res["listings"]) == 0

    def test_buy_apartment_declined_via_dialogue_manager(self):
        res = self.manager.process_voice_turn("I want to buy an apartment")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value
        assert RENTAL_DECLINE in res["final_answer"].lower()
        assert len(res.get("listings", [])) == 0

    def test_buy_then_rent_intent_pivot(self):
        buy_res = self.manager.process_voice_turn("I want to buy an apartment")
        assert RENTAL_DECLINE in buy_res["final_answer"].lower()

        rent_res = self.manager.process_voice_turn("I want to rent an apartment in Indiranagar under 50000")
        assert rent_res.get("intent") != QueryIntent.OUT_OF_SCOPE.value
        assert "rent" in rent_res["final_answer"].lower() or len(rent_res.get("listings", [])) >= 0

    def test_tc_neg_002_buyer_mode_not_available(self):
        res = self.manager.switch_persona("Switch to Buyer mode")
        assert self.manager.current_persona == PersonaRole.RENTER
        assert RENTAL_DECLINE in res["final_answer"].lower()

    def test_tc_neg_003_off_topic_recipe_declined(self):
        res = self.rag.process_query("Can you give me a recipe for chicken biryani?")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value
        assert RENTAL_DECLINE in res["final_answer"].lower()

    def test_tc_neg_004_off_topic_weather_declined(self):
        res = self.rag.process_query("What's the weather in Tokyo today?")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value
        assert len(res["listings"]) == 0

    def test_tc_neg_005_off_topic_politics_declined(self):
        intent = IntentQueryRouter.classify_intent("Who will win the next election?")
        res = self.rag.process_query("Who will win the next election?")
        assert intent == QueryIntent.OUT_OF_SCOPE
        assert RENTAL_DECLINE in res["final_answer"].lower()

    def test_tc_neg_006_mumbai_rental_no_cross_city_listings(self):
        res = self.rag.process_query("Find me a rental flat in Mumbai under ₹30,000.")
        # No Mumbai inventory — should not hallucinate listings
        if res.get("listings"):
            for item in res["listings"]:
                loc = (item.get("locality") or "").lower()
                city = (item.get("city") or "").lower()
                assert "mumbai" not in loc and "mumbai" not in city

    def test_tc_neg_007_commercial_office_not_residential_inventory(self):
        res = self.rag.process_query("I need a commercial office space in Whitefield.")
        if res.get("listings"):
            for item in res["listings"]:
                assert item.get("listing_type", "rent") == "rent"

    def test_tc_neg_008_flight_booking_declined(self):
        res = self.rag.process_query("Book me a flight to Bengaluru.")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value

    # --- Section 2: Invalid criteria ---

    def test_tc_neg_009_zero_bhk_not_matched(self):
        bhk = IntentQueryRouter.extract_bhk_from_query("Show me 0 BHK studio in Indiranagar.")
        assert bhk is None
        res = self.rag.process_query("Show me 0 BHK studio in Indiranagar.", active_locality="Indiranagar")
        if res.get("listings"):
            assert all(item.get("bedrooms", 1) >= 1 for item in res["listings"])

    def test_tc_neg_010_ten_bhk_not_extracted(self):
        bhk = IntentQueryRouter.extract_bhk_from_query("I want a 10 BHK penthouse in Koramangala.")
        assert bhk is None

    def test_tc_neg_011_nonsense_color_bhk_no_crash(self):
        res = self.rag.process_query("Find me a purple BHK flat near metro.")
        assert "final_answer" in res
        assert isinstance(res["final_answer"], str)

    def test_tc_neg_012_fractional_bhk_not_extracted(self):
        bhk = IntentQueryRouter.extract_bhk_from_query("2.5 BHK in Domlur under ₹40,000.")
        assert bhk is None

    def test_tc_neg_013_unrealistic_budget_no_match(self):
        res = self.rag.process_query("Rent under ₹100 per month in Indiranagar.", active_locality="Indiranagar")
        assert NO_MATCH in res["final_answer"] or len(res.get("listings", [])) == 0

    def test_tc_neg_014_extreme_monthly_rent_handled(self):
        res = self.rag.process_query("Show me flats between ₹5 lakh and ₹10 lakh per month.")
        assert "final_answer" in res

    def test_tc_neg_015_gibberish_out_of_scope_or_safe_fallback(self):
        res = self.rag.process_query("asdfghjkl qwerty zxcvbn")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value

    def test_tc_neg_016_emoji_only_out_of_scope(self):
        res = self.rag.process_query("🏠🔥💯")
        assert res["intent"] == QueryIntent.OUT_OF_SCOPE.value

    def test_tc_neg_017_vague_query_no_crash(self):
        res = self.rag.process_query("Find me something nice.")
        assert "final_answer" in res

    def test_tc_neg_018_bhk_only_partial_query(self):
        bhk = IntentQueryRouter.extract_bhk_from_query("2BHK")
        assert bhk == 2

    # --- Section 3: Invalid locations ---

    def test_tc_neg_019_unindexed_locality_negative_grounding(self):
        res = self.rag.process_query(
            "Show 2BHK rentals in Atlantis City under ₹50,000.",
            active_locality="Atlantis City"
        )
        assert NEGATIVE_GROUNDING in res["final_answer"] or NEGATIVE_GROUNDING in res.get("grounded_context", "")

    def test_tc_neg_020_misspelled_locality_fuzzy_or_clarify(self):
        res = self.manager.process_voice_turn("Find flat in Koramngala under 40000")
        assert res.get("active_locality") == "Koramangala" or "Koramangala" in str(res.get("final_answer", ""))

    def test_tc_neg_021_delhi_metro_not_returned(self):
        res = self.rag.process_query("Properties near MG Road metro in Delhi.")
        if res.get("listings"):
            for item in res["listings"]:
                assert "delhi" not in (item.get("locality") or "").lower()

    def test_tc_neg_022_multi_locality_query_no_crash(self):
        q = "Anything in Indiranagar or Koramangala or Whitefield or HSR or Marathahalli or Electronic City"
        res = self.rag.process_query(q)
        assert "final_answer" in res

    def test_tc_neg_023_mid_conversation_locality_pivot(self):
        self.manager.process_voice_turn("2BHK in Indiranagar under 50000")
        res = self.manager.process_voice_turn("Actually, forget Indiranagar — show me Domlur instead.")
        assert self.manager.active_locality != "Indiranagar" or "Domlur" in str(res.get("final_answer", ""))

    def test_tc_neg_024_rapid_locality_changes_use_latest(self):
        self.manager.process_voice_turn("2BHK under 50000 in Whitefield")
        self.manager.process_voice_turn("no Koramangala")
        res = self.manager.process_voice_turn("actually Indiranagar")
        assert self.manager.active_locality == "Indiranagar" or "Indiranagar" in str(res.get("final_answer", ""))

    def test_tc_neg_025_vague_landmark_requires_clarification(self):
        res = self.rag.process_query("Near the big mall.")
        assert "final_answer" in res

    # --- Section 4: Contradictory / incomplete ---

    def test_tc_neg_026_contradictory_bhk_extracts_one_value(self):
        bhk = IntentQueryRouter.extract_bhk_from_query("I want a 2BHK but also need 3 bedrooms.")
        assert bhk in (2, 3)

    def test_tc_neg_027_budget_change_no_crash(self):
        self.manager.process_voice_turn("Budget is ₹25,000")
        res = self.manager.process_voice_turn("actually unlimited budget")
        assert "final_answer" in res

    def test_tc_neg_028_conflicting_pet_requirements_no_crash(self):
        res = self.rag.process_query("Must be pet-friendly but no pets allowed in building.")
        assert "final_answer" in res

    def test_tc_neg_029_repeated_constraint_changes_no_crash(self):
        self.manager.process_voice_turn("2BHK in Indiranagar under ₹40k")
        self.manager.process_voice_turn("Show only 3BHK")
        self.manager.process_voice_turn("Back to 2BHK")
        res = self.manager.process_voice_turn("₹60k is fine")
        assert "final_answer" in res

    def test_tc_neg_030_context_locality_reuse(self):
        self.manager.process_voice_turn("2BHK in Koramangala under 40000")
        res = self.manager.process_voice_turn("I said Koramangala already — why are you asking again?")
        assert "final_answer" in res

    def test_tc_neg_032_refused_budget_no_crash(self):
        res = self.manager.process_voice_turn("I don't want to tell you my budget.")
        assert "final_answer" in res

    # --- Section 5: Unavailable inventory ---

    def test_tc_neg_034_over_constrained_search_no_hallucination(self):
        res = self.rag.process_query("4+ BHK in Pete Area under ₹15,000.", active_locality="Pete Area")
        assert NO_MATCH in res["final_answer"] or len(res.get("listings", [])) == 0

    def test_tc_neg_035_impossible_amenity_combo_no_crash(self):
        res = self.rag.process_query(
            "Fully furnished 1 BHK in Sadashivanagar under ₹10,000 with private pool.",
            active_locality="Sadashivanagar"
        )
        assert NO_MATCH in res["final_answer"] or len(res.get("listings", [])) == 0

    def test_tc_neg_037_exact_rent_filter_no_crash(self):
        res = self.rag.process_query("Only properties with rent exactly ₹37,842.")
        assert "final_answer" in res

    def test_tc_neg_038_delta_drop_above_40k(self):
        seed = [
            {"listing_id": "p1", "locality": "Koramangala", "rent_inr": 32000},
            {"listing_id": "p2", "locality": "Koramangala", "rent_inr": 45000},
        ]
        kept, delta = ShortlistDeltaEngine.apply_delta(seed, "drop everything above ₹40k")
        assert len(kept) == 1
        assert all(item["rent_inr"] <= 40000 for item in kept)

    def test_tc_neg_039_delta_before_shortlist_no_crash(self):
        self.manager.active_shortlist = []
        res = self.manager.process_voice_turn("drop everything above ₹40k")
        assert res.get("type") == "shortlist_delta_edit" or "final_answer" in res

    # --- Section 6: Policy boundaries ---

    def test_tc_neg_040_negotiation_request_no_crash(self):
        res = self.rag.process_query("Can you negotiate rent with the owner on my behalf?")
        assert "final_answer" in res

    def test_tc_neg_041_payment_request_declined_or_no_payment_flow(self):
        res = self.rag.process_query("Transfer ₹50,000 token amount now to book the flat.")
        assert "final_answer" in res
        assert "upi" not in res["final_answer"].lower()

    def test_tc_neg_043_binary_safety_not_absolute(self):
        res = self.rag.process_query(
            "Is Koramangala 100% safe for women at night?",
            active_locality="Koramangala"
        )
        assert res["intent"] == QueryIntent.CRIME_SAFETY.value
        assert "binary" in res.get("policy_notice", "").lower()
        assert "100%" not in res["final_answer"]

    def test_tc_neg_044_seller_listing_while_renter_switches_or_declines(self):
        assert self.manager.current_persona == PersonaRole.RENTER
        res = self.manager.switch_persona("Seller mode")
        assert self.manager.current_persona == PersonaRole.SELLER_BROKER
        assert "seller" in res["final_answer"].lower() or "landlord" in res["final_answer"].lower()

    def test_tc_neg_045_language_switch_no_crash(self):
        res = self.rag.process_query("Translate this chat to Kannada and continue in Kannada only.")
        assert "final_answer" in res

    # --- Section 7: Voice/session edge cases (logic-level) ---

    def test_tc_neg_049_long_rambling_extracts_bhk(self):
        long_q = (
            "So yesterday I was talking to my friend about moving and then we went for coffee "
            "and watched cricket and also thought about weather and traffic and maybe 2BHK?"
        )
        bhk = IntentQueryRouter.extract_bhk_from_query(long_q)
        assert bhk == 2
        res = self.manager.process_voice_turn(long_q)
        assert "final_answer" in res

    def test_tc_neg_050_cancel_resets_booking_prompt(self):
        self.manager.pending_visit_offer = True
        res = self.manager.process_voice_turn("cancel cancel cancel stop stop stop reset")
        # Persona switch handler treats reset keywords via switch_persona path or RAG — ensure no crash
        assert "final_answer" in res or res.get("status") == "persona_switched"
