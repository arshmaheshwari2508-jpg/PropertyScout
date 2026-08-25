"""
Multi-Persona Dialogue Manager for Voice-First AI Property Scout.
Manages AI dialogue states, persona workspace switching, voice site visit booking,
proactive site visit offer prompts, and seller intake forms across:
  - Buyer Mode
  - Renter Mode
  - Seller / Landlord / Broker Mode (with 0.3 weighted RAG review ingestion)
"""

import re
import urllib.parse
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from src.grounding.rag_policy_engine import RAGPolicyEngine
from src.agent.delta_engine import ShortlistDeltaEngine
from src.data.listings_db import PropertyListingsDB
from src.data.broker_booking_db import BrokerBookingDB, STANDARD_TIME_SLOTS


class PersonaRole(str, Enum):
    BUYER = "Buyer"
    RENTER = "Renter"
    SELLER_BROKER = "Seller/Broker"


class MultiPersonaDialogueManager:
    def __init__(
        self,
        policy_engine: Optional[RAGPolicyEngine] = None,
        listings_db: Optional[PropertyListingsDB] = None,
        broker_db: Optional[BrokerBookingDB] = None
    ):
        self.policy_engine = policy_engine or RAGPolicyEngine()
        self.listings_db = listings_db or PropertyListingsDB()
        self.broker_db = broker_db or BrokerBookingDB()
        
        # State tracking
        self.current_persona: PersonaRole = PersonaRole.RENTER
        self.active_locality: Optional[str] = None
        self.active_shortlist: List[Dict[str, Any]] = []
        self.conversation_history: List[Dict[str, str]] = []
        self.pending_visit_offer: bool = False
        
        # Initialize default shortlist
        self.active_shortlist = self.listings_db.get_all_active_listings()

    def switch_persona(self, new_persona: str) -> Dict[str, Any]:
        """Switches the active persona workspace mode with role-specific voice greeting."""
        persona_str = new_persona.strip()
        if "buyer" in persona_str.lower():
            self.current_persona = PersonaRole.BUYER
            greeting = "Switched to Buyer Mode! Are you looking to purchase an apartment or villa in Bengaluru? What is your target purchase budget and preferred locality?"
        elif "seller" in persona_str.lower() or "broker" in persona_str.lower() or "landlord" in persona_str.lower():
            self.current_persona = PersonaRole.SELLER_BROKER
            greeting = "Switched to Seller & Broker Intake Mode! You can list your property here. What is the property name, locality, price, and any special highlights you'd like to share?"
        else:
            self.current_persona = PersonaRole.RENTER
            greeting = "Switched to Renter Mode! I can help you find your ideal rental home. Which neighborhood in Bengaluru do you prefer, and what is your monthly budget?"

        # Re-filter shortlist for the new persona
        self.active_shortlist = self.listings_db.filter_listings(
            listing_type="sale" if self.current_persona == PersonaRole.BUYER else "rent"
        )

        return {
            "status": "persona_switched",
            "active_persona": self.current_persona.value,
            "final_answer": greeting,
            "message": greeting,
            "shortlist": self.active_shortlist
        }

    def process_seller_intake(
        self,
        property_title: str,
        locality: str,
        price_inr: float,
        bedrooms: int,
        sqft: int,
        seller_review_notes: str
    ) -> Dict[str, Any]:
        """Processes seller property intake form and tags notes for RAG ingestion."""
        raw_listing = {
            "society_name": property_title,
            "locality": locality,
            "city": "Bengaluru",
            "listing_type": "sale" if self.current_persona == PersonaRole.BUYER else "rent",
            "rent_inr": price_inr if self.current_persona == PersonaRole.RENTER else None,
            "sale_price_inr": price_inr if self.current_persona == PersonaRole.BUYER else None,
            "bedrooms": bedrooms,
            "bathrooms": bedrooms,
            "sqft": sqft,
            "furnishing": "Semi-Furnished",
            "description": seller_review_notes,
            "seller_note": seller_review_notes,
            "source_weight": 0.3
        }

        saved_item = self.listings_db.add_seller_listing(raw_listing)
        self.active_shortlist.append(saved_item)

        msg = f"Property '{property_title}' in {locality} has been successfully listed! Your review notes have been saved for tenant discovery."

        return {
            "status": "seller_intake_success",
            "listing": saved_item,
            "seller_rag_weight": 0.3,
            "final_answer": msg,
            "message": msg
        }

    def _execute_voice_site_visit_booking(self, transcript: str) -> Dict[str, Any]:
        """Executes voice site visit booking after confirmation."""
        text = transcript.lower()

        # Find match by property name in transcript first, otherwise use first active listing
        target_property = None
        for prop in self.active_shortlist:
            name = prop.get("society_name", "").lower()
            if any(token in text for token in name.split()):
                target_property = prop
                break

        if not target_property:
            target_property = self.active_shortlist[0] if self.active_shortlist else {
                "society_name": "Prestige Silver Oak",
                "locality": "Indiranagar",
                "rent_inr": 45000
            }

        prop_title = target_property.get("society_name", "Bengaluru Property")
        locality = target_property.get("locality", "Bengaluru")
        price = f"₹{target_property.get('rent_inr' if self.current_persona == PersonaRole.RENTER else 'sale_price_inr'):,}" if target_property.get("rent_inr") or target_property.get("sale_price_inr") else "N/A"

        # Determine time slot
        slot = STANDARD_TIME_SLOTS[0]
        if "10" in text:
            slot = STANDARD_TIME_SLOTS[0]
        elif "11" in text or "11:30" in text or "12" in text:
            slot = STANDARD_TIME_SLOTS[1]
        elif "2" in text or "14" in text:
            slot = STANDARD_TIME_SLOTS[2]
        elif "4" in text or "16" in text:
            slot = STANDARD_TIME_SLOTS[3]

        visit_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        # Check broker availability
        booking_res = self.broker_db.book_site_visit(
            user_name="Voice User",
            user_email="arshmaheshwari25088@gmail.com",
            phone="+91 9876543210",
            visit_date=visit_date,
            time_slot=slot,
            property_title=prop_title,
            locality=locality,
            price=price
        )

        self.pending_visit_offer = False

        if booking_res.get("success"):
            broker = booking_res.get("broker", {})
            msg = f"Awesome! I have booked your physical site visit for {prop_title} in {locality} on {visit_date} at {slot}. You are assigned to licensed broker {broker.get('name')} ({broker.get('phone')}). Confirmation email and Google Calendar invite sent!"
            return {
                "active_persona": self.current_persona.value,
                "type": "voice_site_visit_booking",
                "success": True,
                "booking": booking_res,
                "final_answer": msg,
                "open_booking_modal": False,
                "shortlist": self.active_shortlist
            }
        else:
            msg = f"All 8 of our property brokers are fully booked for {slot} on {visit_date}. I have opened the booking calendar modal for you where you can pick available slots shown in green and busy slots in red."
            return {
                "active_persona": self.current_persona.value,
                "type": "voice_site_visit_booking",
                "success": False,
                "error": "ALL_BROKERS_BUSY",
                "final_answer": msg,
                "open_booking_modal": True,
                "property": target_property,
                "shortlist": self.active_shortlist
            }

    def process_voice_turn(self, user_transcript: str, active_locality: Optional[str] = None) -> Dict[str, Any]:
        """
        Processes a user voice turn, updating active locality and shortlist dynamically
        to ensure multiple matching properties are returned.
        """
        self.conversation_history.append({"role": "user", "text": user_transcript})
        text = user_transcript.lower()

        # Update active locality state if mentioned in user transcript
        extracted_loc = None
        locality_map = {
            "koramangala": "Koramangala",
            "kormangala": "Koramangala",
            "kormangla": "Koramangala",
            "kora": "Koramangala",
            "indiranagar": "Indiranagar",
            "hsr": "HSR Layout",
            "whitefield": "Whitefield",
            "bellandur": "Bellandur",
            "mahadevapura": "Mahadevapura"
        }
        for kw, loc_name in locality_map.items():
            if kw in text:
                extracted_loc = loc_name
                break

        if extracted_loc:
            self.active_locality = extracted_loc
        elif active_locality:
            self.active_locality = active_locality

        # Extract max budget if present in user speech
        from src.grounding.query_router import IntentQueryRouter
        max_budget = IntentQueryRouter.extract_max_budget_inr(user_transcript)

        # Extract BHK if present in user speech
        exact_bhk = None
        if "1bhk" in text or "1 bhk" in text or "1 bedroom" in text:
            exact_bhk = 1
        elif "2bhk" in text or "2 bhk" in text or "2 bedroom" in text:
            exact_bhk = 2
        elif "3bhk" in text or "3 bhk" in text or "3 bedroom" in text:
            exact_bhk = 3
        elif "4bhk" in text or "4 bhk" in text or "4 bedroom" in text:
            exact_bhk = 4

        # Update dynamic active shortlist based on locality, listing type (sale vs rent), max budget, and exact BHK
        filtered = self.listings_db.filter_listings(
            locality=self.active_locality,
            listing_type="sale" if self.current_persona == PersonaRole.BUYER else "rent",
            max_price=max_budget,
            exact_bedrooms=exact_bhk
        )
        self.active_shortlist = filtered

        # 1. Check persona switch
        if any(w in text for w in ["buyer mode", "renter mode", "seller mode", "broker mode"]):
            switch_res = self.switch_persona(user_transcript)
            self.conversation_history.append({"role": "assistant", "text": switch_res["message"]})
            return switch_res

        # 2. Check if user is confirming a site visit booking
        if self.pending_visit_offer or any(k in text for k in ["book site visit", "schedule site visit", "book visit", "schedule visit", "confirm visit", "book it"]):
            if any(yes_w in text for yes_w in ["yes", "yeah", "sure", "ok", "book", "schedule", "please", "confirm"]):
                # If date/time not specified in text, prompt for slot
                if not any(slot_num in text for slot_num in ["10", "11", "12", "2", "4", "tomorrow", "august", "today"]):
                    self.pending_visit_offer = True
                    msg = "Great! Which date and time slot (10:00 AM - 11:00 AM, 11:30 AM - 12:30 PM, 02:00 PM - 03:00 PM, or 04:00 PM - 05:00 PM) works best for your site visit?"
                    self.conversation_history.append({"role": "assistant", "text": msg})
                    return {
                        "active_persona": self.current_persona.value,
                        "type": "prompt_booking_time_slot",
                        "final_answer": msg,
                        "shortlist": self.active_shortlist
                    }
                
                # Execute direct booking
                return self._execute_voice_site_visit_booking(user_transcript)

        # 3. Check voice delta shortlist edits
        if any(w in text for w in ["drop", "remove", "only show", "filter out"]):
            updated_shortlist, delta = ShortlistDeltaEngine.apply_delta(self.active_shortlist, user_transcript)
            self.active_shortlist = updated_shortlist
            
            response_text = f"Updated your shortlist! Removed {delta['removed_count']} listing(s) based on your command. You currently have {len(self.active_shortlist)} matching properties."
            self.conversation_history.append({"role": "assistant", "text": response_text})
            
            return {
                "active_persona": self.current_persona.value,
                "type": "shortlist_delta_edit",
                "delta": delta,
                "shortlist": self.active_shortlist,
                "final_answer": response_text
            }

        # 4. Grounded query routing & response via RAG Policy Engine
        rag_res = self.policy_engine.process_query(
            user_query=user_transcript,
            active_locality=self.active_locality,
            persona=self.current_persona.value
        )

        # Tag pending offer if RAG Policy Engine asked about site visit
        if "site visit" in rag_res.get("final_answer", "").lower():
            self.pending_visit_offer = True

        self.conversation_history.append({"role": "assistant", "text": rag_res.get("final_answer", "")})
        rag_res["active_persona"] = self.current_persona.value
        rag_res["active_shortlist"] = self.active_shortlist
        rag_res["shortlist"] = self.active_shortlist
        
        return rag_res
