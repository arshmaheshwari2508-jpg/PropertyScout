"""
Interactive Local Testing CLI for Voice-First AI Property Scout.
Run this script to interactively test persona switching, property searches,
targeted voice edits, RAG citations, spatial metrics, and Gemini/Smallest AI responses.

Usage:
  python3 scripts/interactive_cli.py
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.agent.dialogue_manager import MultiPersonaDialogueManager, PersonaRole
from src.grounding.citation_resolver import CitationResolver


def print_banner():
    print("=" * 70)
    print(" 🎙️  VOICE-FIRST AI PROPERTY SCOUT — INTERACTIVE LOCAL CLI TESTER ")
    print("=" * 70)
    print(" Commands:")
    print("   'buyer'      - Switch to Buyer Persona Mode")
    print("   'renter'     - Switch to Renter Persona Mode")
    print("   'seller'     - Switch to Seller/Landlord/Broker Persona Mode")
    print("   'listings'   - Display current active property shortlist")
    print("   'intake'     - Submit a new property listing (Seller Mode)")
    print("   'quit' / 'exit' - Exit CLI tester")
    print("-" * 70)


def format_listing(item: dict) -> str:
    price = f"₹{item.get('rent_inr'):,}/mo" if item.get('rent_inr') else f"₹{item.get('sale_price_inr'):,}"
    seller_tag = " [Seller Note]" if item.get("source_weight", 1.0) < 1.0 else ""
    return f"• [{item.get('listing_id')}] {item.get('society_name')} ({item.get('locality')}) | {item.get('bedrooms')}BHK, {item.get('sqft')} sqft | Price: {price}{seller_tag}"


def run_cli():
    manager = MultiPersonaDialogueManager()
    citation_resolver = CitationResolver()
    
    print_banner()
    print(f"\n[System Initialized]: Active Persona = \033[1;34m{manager.current_persona.value} Mode\033[0m")
    
    while True:
        try:
            prompt_label = f"\n[{manager.current_persona.value} Mode] Ask query or command > "
            user_input = input(prompt_label).strip()
            
            if not user_input:
                continue
                
            cmd_lower = user_input.lower()
            
            if cmd_lower in ["exit", "quit", "q"]:
                print("\nExiting Voice-First AI Property Scout CLI. Goodbye! 👋\n")
                break
                
            if cmd_lower == "listings":
                print(f"\n📋 Active Shortlist ({len(manager.active_shortlist)} items):")
                for item in manager.active_shortlist:
                    print(format_listing(item))
                continue

            if cmd_lower == "intake":
                print("\n--- Seller Property Intake Form ---")
                title = input("Property / Society Name: ").strip() or "Prestige Oasis"
                locality = input("Locality (e.g. Koramangala, Indiranagar): ").strip() or "Koramangala"
                price = float(input("Price (INR): ").strip() or "36000")
                bhk = int(input("Bedrooms (BHK): ").strip() or "2")
                sqft = int(input("Square Feet (sqft): ").strip() or "1200")
                notes = input("Seller Review & Highlights: ").strip() or "Spacious 2BHK with modular kitchen and garden view."
                
                intake_res = manager.process_seller_intake(
                    property_title=title,
                    locality=locality,
                    price_inr=price,
                    bedrooms=bhk,
                    sqft=sqft,
                    seller_review_notes=notes
                )
                print(f"\n✅ {intake_res['message']}")
                continue

            # Process voice turn via MultiPersonaDialogueManager
            res = manager.process_voice_turn(user_input)
            
            print(f"\n🤖 \033[1;32mAI Response ({res.get('active_persona', 'Scout')})\033[0m:")
            print(f"   {res.get('final_answer') or res.get('grounded_context')}")
            
            if res.get("intent"):
                print(f"\n📌 Intent Layer: \033[1;33m{res['intent']}\033[0m | Source: {res.get('data_source')}")
                
            if res.get("citations"):
                print("📚 Citations & Visual References:")
                for cite in res["citations"]:
                    print(f"   • [{cite.get('source_id')}] {cite.get('name')} ({cite.get('type')})")

            if res.get("type") == "shortlist_delta_edit":
                delta = res.get("delta", {})
                print(f"\n⚡ Voice Edit Applied: Removed {delta.get('removed_count')} items, Kept {delta.get('kept_count')} items.")
                if delta.get("removed"):
                    print("   Removed listings:")
                    for rem in delta["removed"]:
                        print(f"   - {rem.get('society_name')} ({rem.get('locality')})")

        except (KeyboardInterrupt, EOFError):
            print("\nExiting CLI tester. Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")


if __name__ == "__main__":
    run_cli()
