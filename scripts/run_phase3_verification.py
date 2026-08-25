"""
Verification Script for Phase 3 Implementation.
Validates:
  1. Multi-Persona Workspace Switching (Buyer vs Renter vs Seller/Broker).
  2. Seller Property Intake & Multiline Review Notes ingestion (weighted 0.3 in RAG).
  3. Targeted Shortlist Delta Engine (voice edit commands like 'drop properties above 40k').
  4. End-to-end voice turn processing & conversation state tracking.
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.agent.dialogue_manager import MultiPersonaDialogueManager, PersonaRole
from src.agent.delta_engine import ShortlistDeltaEngine


def test_persona_switching():
    print("\n--- Testing Multi-Persona Workspace Switching ---", flush=True)
    manager = MultiPersonaDialogueManager()
    
    assert manager.current_persona == PersonaRole.RENTER, "Default mode should be Renter!"
    print(f"Default Persona: {manager.current_persona.value}")
    
    # Switch to Buyer Mode
    res_buyer = manager.switch_persona("Switch to Buyer Mode")
    print(f"Buyer Switch: {res_buyer['message']}")
    assert manager.current_persona == PersonaRole.BUYER, "Should switch to Buyer Mode!"
    
    # Switch to Seller/Broker Mode
    res_seller = manager.switch_persona("Switch to Seller Mode")
    print(f"Seller Switch: {res_seller['message']}")
    assert manager.current_persona == PersonaRole.SELLER_BROKER, "Should switch to Seller/Broker Mode!"
    
    print("✅ Multi-Persona Workspace Switching Test Passed!", flush=True)


def test_seller_property_intake():
    print("\n--- Testing Seller Property Intake & 0.3 Weight Review Ingestion ---", flush=True)
    manager = MultiPersonaDialogueManager()
    manager.switch_persona("Seller Mode")
    
    intake_res = manager.process_seller_intake(
        property_title="Greenwood Residency",
        locality="Indiranagar 100ft Road",
        price_inr=42000,
        bedrooms=2,
        sqft=1300,
        seller_review_notes="Spacious corner apartment with newly installed modular kitchen and north-facing balcony."
    )
    
    print(f"Intake Result: Status='{intake_res['status']}', RAG Weight={intake_res['seller_rag_weight']}")
    assert intake_res["status"] == "seller_intake_success", "Intake must succeed!"
    assert intake_res["seller_rag_weight"] == 0.3, "Seller claims MUST be tagged with 0.3 RAG weight!"
    assert "owner_name" not in intake_res["listing"], "Listing MUST be PII-sanitized!"
    
    print("✅ Seller Property Intake Test Passed!", flush=True)


def test_shortlist_delta_engine():
    print("\n--- Testing Targeted Shortlist Delta Engine ---", flush=True)
    
    seed_shortlist = [
        {"listing_id": "item_1", "locality": "Koramangala", "rent_inr": 35000, "bedrooms": 2, "furnishing": "Semi-Furnished"},
        {"listing_id": "item_2", "locality": "Koramangala", "rent_inr": 48000, "bedrooms": 3, "furnishing": "Fully Furnished"},
        {"listing_id": "item_3", "locality": "Indiranagar", "rent_inr": 38000, "bedrooms": 2, "furnishing": "Fully Furnished"},
    ]
    
    # Apply voice edit command: "drop properties above 40k"
    kept, delta = ShortlistDeltaEngine.apply_delta(seed_shortlist, "drop properties above 40k")
    
    print(f"Voice Edit: 'drop properties above 40k' -> Removed {delta['removed_count']} items, Kept {delta['kept_count']} items.")
    print(f"Removed IDs: {delta['removed_ids']}")
    
    assert len(kept) == 2, "Should keep 2 properties under 40k!"
    assert len(delta["removed"]) == 1, "Should remove 1 property above 40k!"
    assert delta["removed"][0]["listing_id"] == "item_2", "Should specifically remove item_2 (48k)!"
    
    print("✅ Targeted Shortlist Delta Engine Test Passed!", flush=True)


def test_end_to_end_voice_turn():
    print("\n--- Testing End-to-End Voice Turn & Dialogue State ---", flush=True)
    manager = MultiPersonaDialogueManager()
    
    # Turn 1: Listing query
    t1 = manager.process_voice_turn("Show me 2BHK rent under 40k in Koramangala")
    print(f"Turn 1 Intent: {t1['intent']}, Data Source: {t1['data_source']}")
    assert t1["intent"] == "LISTING_PRICING", "Turn 1 must be LISTING_PRICING!"
    
    # Turn 2: Voice delta edit
    t2 = manager.process_voice_turn("drop properties above 35k")
    print(f"Turn 2 Response: {t2['final_answer']}")
    assert t2["type"] == "shortlist_delta_edit", "Turn 2 must be shortlist_delta_edit!"
    
    print("✅ End-to-End Voice Turn Test Passed!", flush=True)


if __name__ == "__main__":
    test_persona_switching()
    test_seller_property_intake()
    test_shortlist_delta_engine()
    test_end_to_end_voice_turn()
    print("\n🎉 ALL PHASE 3 TESTS PASSED SUCCESSFULLY!", flush=True)
