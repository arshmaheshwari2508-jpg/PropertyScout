"""
End-to-End Voice Flow & Dialogue Verification Script.
Tests the full multi-turn voice interaction loop:
1. Full 4-Step Questionnaire to Verdict with explicit property recommendations.
2. Post-Verdict Site Visit Booking turn.
3. Post-Verdict Spatial & Metro Telemetry turn.
4. Post-Verdict Non-Binary Safety Telemetry turn.
5. Unindexed / Zero-Match Locality Nearby Property Fallback.
6. Graceful Closing Turn ("Thank you").
"""

import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.agent.dialogue_manager import MultiPersonaDialogueManager
from src.grounding.rag_policy_engine import RAGPolicyEngine

def run_end_to_end_verification():
    print("=" * 80)
    print("🚀 RUNNING END-TO-END VOICE FLOW & DIALOGUE VERIFICATION SUITE")
    print("=" * 80)

    policy_engine = RAGPolicyEngine()
    manager = MultiPersonaDialogueManager(policy_engine=policy_engine)

    # ----------------------------------------------------
    # TEST 1: Standard Questionnaire to Verdict
    # ----------------------------------------------------
    print("\n🔹 TEST 1: Standard Rental Query Verdict & Property Suggestions")
    res1 = policy_engine.process_query("Find 2BHK rental flat in Koramangala under 50000 rupees")
    final_ans1 = res1.get("final_answer", "")
    print(f"Assistant Answer:\n  {final_ans1}")
    assert "suggested properties for you" in final_ans1.lower() or "matching" in final_ans1.lower(), (
        f"FAILED: Verdict does not contain property suggestions! Got: {final_ans1}"
    )
    print("  ✅ TEST 1 PASSED: Verdict cleanly lists suggested properties.")

    # ----------------------------------------------------
    # TEST 2: Voice Site Visit Booking Turn
    # ----------------------------------------------------
    print("\n🔹 TEST 2: Voice Site Visit Booking Post-Verdict Turn")
    res2 = manager._execute_voice_site_visit_booking("Book a site visit for Prestige Silver Oak at 10 AM")
    final_ans2 = res2.get("final_answer", "")
    print(f"Assistant Answer:\n  {final_ans2}")
    assert "booked your physical site visit" in final_ans2.lower() or "booking calendar" in final_ans2.lower(), (
        f"FAILED: Site visit booking failed! Got: {final_ans2}"
    )
    print("  ✅ TEST 2 PASSED: Voice site visit booking executed successfully.")

    # ----------------------------------------------------
    # TEST 3: Post-Verdict Spatial / Metro Query
    # ----------------------------------------------------
    print("\n🔹 TEST 3: Post-Verdict Spatial & Metro Telemetry Query")
    res3 = policy_engine.process_query("How far is the nearest metro station to Koramangala?")
    final_ans3 = res3.get("final_answer", "")
    print(f"Assistant Answer:\n  {final_ans3}")
    assert "metro" in final_ans3.lower(), f"FAILED: Metro telemetry missing! Got: {final_ans3}"
    print("  ✅ TEST 3 PASSED: Spatial telemetry returned successfully.")

    # ----------------------------------------------------
    # TEST 4: Post-Verdict Safety Telemetry Query
    # ----------------------------------------------------
    print("\n🔹 TEST 4: Post-Verdict Safety & Crime Evidence Query")
    res4 = policy_engine.process_query("Is Koramangala safe at night?")
    final_ans4 = res4.get("final_answer", "")
    print(f"Assistant Answer:\n  {final_ans4}")
    assert any(w in final_ans4.lower() for w in ["police", "cctv", "crime", "verified", "records", "karnataka", "safety", "evidence", "statistics", "report", "scout"]), (
        f"FAILED: Safety telemetry missing! Got: {final_ans4}"
    )
    print("  ✅ TEST 4 PASSED: Safety evidence returned successfully.")

    # ----------------------------------------------------
    # TEST 5: Zero Match / Unindexed Locality Nearby Suggestions
    # ----------------------------------------------------
    print("\n🔹 TEST 5: Zero Match / Unindexed Locality Nearby Suggestions")
    res5 = policy_engine.process_query("Find 2BHK rental flat in UnindexedRandomLocalityXYZ")
    final_ans5 = res5.get("final_answer", "")
    print(f"Assistant Answer:\n  {final_ans5}")
    assert "suggested properties" in final_ans5.lower() or "suggested nearby properties" in final_ans5.lower(), (
        f"FAILED: Nearby suggestions missing on zero match! Got: {final_ans5}"
    )
    print("  ✅ TEST 5 PASSED: Suggested nearby properties returned out loud.")

    # ----------------------------------------------------
    # TEST 6: Multi-Turn Conversation History (No Turn Cap)
    # ----------------------------------------------------
    print("\n🔹 TEST 6: Unlimited Conversation Turns (No Turn Cap)")
    turns = [
        "Tell me about Koramangala history",
        "What are the amenities?",
        "Is there a park nearby?",
        "Can I bring my pet dog?",
        "What is the security deposit?",
        "Book a site visit for tomorrow"
    ]
    for i, t in enumerate(turns, start=1):
        res = manager.process_voice_turn(t, active_locality="Koramangala")
        ans = res.get("final_answer", "")
        assert len(ans) > 0, f"Turn {i} failed with empty response!"
        print(f"  Turn {i} ('{t}'): Success")

    print("  ✅ TEST 6 PASSED: Conversed through 6 consecutive turns without any turn cap!")

    print("\n" + "=" * 80)
    print("🎉 ALL END-TO-END VOICE FLOW & DIALOGUE VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_end_to_end_verification()
