"""
Local FastAPI Server for Voice-First AI Property Scout.
Exposes local REST API endpoints for testing:
  - GET  /api/health
  - GET  /api/listings
  - POST /api/chat (Voice/Text turns, intent routing, persona execution)
  - POST /api/persona/switch
  - POST /api/seller/intake
  - POST /api/schedule-site-visit
"""

import os
import sys
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.agent.dialogue_manager import MultiPersonaDialogueManager
from src.api.email_service import send_site_visit_email
from src.data.broker_booking_db import BrokerBookingDB

app = FastAPI(
    title="Voice-First AI Property Scout API",
    description="Local REST API for Bengaluru Real Estate Voice Scout",
    version="2.4.0"
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.data.live_bengaluru_scraper import LiveBengaluruPropertyScraper

# Global dialogue manager, broker booking database, and live scraper instances
dialogue_manager = MultiPersonaDialogueManager()
broker_db = BrokerBookingDB()
live_scraper = LiveBengaluruPropertyScraper()


@app.on_event("startup")
def auto_sync_bengaluru_rent_listings():
    """Automatically syncs bengaluru.rent rental listings in the background on API startup."""
    print("🚀 Auto-syncing bengaluru.rent rental listings on backend startup...")
    try:
        live_scraper.run_live_scraper_sync()
        dialogue_manager.listings_db.reload()
        dialogue_manager.active_shortlist = dialogue_manager.listings_db.get_all_active_listings()
        print(f"✅ Backend auto-sync complete! Active Rental Properties: {len(dialogue_manager.active_shortlist)}")
    except Exception as e:
        print(f"Notice during backend auto-sync: {e}")


class ChatRequest(BaseModel):
    user_query: str
    active_locality: Optional[str] = None


class PersonaSwitchRequest(BaseModel):
    persona: str


class ScraperRequest(BaseModel):
    locality: Optional[str] = None


class SellerIntakeRequest(BaseModel):
    property_title: str
    locality: str
    price_inr: float
    bedrooms: int
    sqft: int
    seller_review_notes: str


class SiteVisitRequest(BaseModel):
    user_name: str
    user_email: str
    phone: str
    visit_date: str
    time_slot: Optional[str] = "10:00 AM - 11:00 AM"
    property_title: str
    locality: str
    price: Optional[str] = "N/A"


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "active_persona": dialogue_manager.current_persona.value,
        "listings_count": len(dialogue_manager.active_shortlist),
        "brokers_count": len(broker_db.get_all_brokers())
    }


@app.get("/api/listings")
def get_listings():
    all_listings = dialogue_manager.listings_db.get_all_active_listings()
    return {
        "active_persona": dialogue_manager.current_persona.value,
        "count": len(all_listings),
        "listings": all_listings
    }


@app.post("/api/scraper/run")
def run_live_scraper(req: ScraperRequest = ScraperRequest()):
    """Triggers live real-time Bengaluru property web scraper, scrubs PII, and reloads listings DB."""
    res = live_scraper.run_live_scraper_sync(req.locality)
    # Sync dialogue manager shortlist with newly scraped database
    dialogue_manager.listings_db.reload()
    dialogue_manager.active_shortlist = dialogue_manager.listings_db.get_all_active_listings()
    return res


@app.get("/api/brokers")
def get_brokers():
    """Returns list of all 8 brokers and booking counts."""
    return {
        "count": 8,
        "brokers": broker_db.get_all_brokers()
    }


@app.get("/api/brokers/availability")
def check_broker_availability(visit_date: str, time_slot: str = "10:00 AM - 11:00 AM"):
    """Returns free brokers for specified date and time slot."""
    free_brokers = broker_db.get_available_brokers(visit_date, time_slot)
    return {
        "visit_date": visit_date,
        "time_slot": time_slot,
        "available_count": len(free_brokers),
        "total_brokers": 8,
        "is_available": len(free_brokers) > 0,
        "free_brokers": free_brokers
    }


@app.post("/api/chat")
def process_chat(req: ChatRequest):
    if not req.user_query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
        
    response = dialogue_manager.process_voice_turn(req.user_query, req.active_locality)
    return response


@app.post("/api/persona/switch")
def switch_persona(req: PersonaSwitchRequest):
    return dialogue_manager.switch_persona(req.persona)


@app.post("/api/seller/intake")
def seller_intake(req: SellerIntakeRequest):
    return dialogue_manager.process_seller_intake(
        property_title=req.property_title,
        locality=req.locality,
        price_inr=req.price_inr,
        bedrooms=req.bedrooms,
        sqft=req.sqft,
        seller_review_notes=req.seller_review_notes
    )


@app.post("/api/schedule-site-visit")
def schedule_site_visit(req: SiteVisitRequest):
    """
    Schedules physical site visit with 8-broker collision check,
    Google Calendar event sync, and HTML confirmation email.
    """
    booking_res = broker_db.book_site_visit(
        user_name=req.user_name,
        user_email=req.user_email,
        phone=req.phone,
        visit_date=req.visit_date,
        time_slot=req.time_slot or "10:00 AM - 11:00 AM",
        property_title=req.property_title,
        locality=req.locality,
        price=req.price or "N/A"
    )

    if not booking_res.get("success"):
        return booking_res

    # Dispatch email with assigned broker info and Google Calendar link
    broker_info = booking_res.get("broker", {})
    gcal_info = booking_res.get("google_calendar", {})

    email_res = send_site_visit_email(
        user_name=req.user_name,
        user_email=req.user_email,
        visit_date=req.visit_date,
        time_slot=booking_res.get("time_slot", "10:00 AM - 11:00 AM"),
        property_title=req.property_title,
        locality=req.locality,
        price=req.price or "N/A",
        broker_name=broker_info.get("name", "SCOUT Broker"),
        broker_phone=broker_info.get("phone", "+91 98765 11001"),
        broker_email=broker_info.get("email", "broker@scout.ai"),
        calendar_link=gcal_info.get("calendar_html_link", "")
    )

    booking_res["email_dispatch"] = email_res
    return booking_res


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

