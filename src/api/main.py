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
import json
import threading
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.api.email_service import send_site_visit_email

app = FastAPI(
    title="Voice-First AI Property Scout API",
    description="Local REST API for Bengaluru Real Estate Voice Scout",
    version="2.4.0"
)

# CORS — local Vite + production Vercel frontend (booking modal is browser-side)
# Without Access-Control-Allow-Origin for the Vercel host, fetch() fails and the UI
# shows "Could not reach the booking server" even when Railway is healthy.
_DEFAULT_CORS_ORIGINS = ",".join([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://property-scout-beryl.vercel.app",
])
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", _DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Preview + production Vercel deployments share *.vercel.app
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_dialogue_manager = None
_broker_db = None
_live_scraper = None


def get_dialogue_manager():
    global _dialogue_manager
    if _dialogue_manager is None:
        from src.agent.dialogue_manager import MultiPersonaDialogueManager
        _dialogue_manager = MultiPersonaDialogueManager()
    return _dialogue_manager


def get_broker_db():
    global _broker_db
    if _broker_db is None:
        from src.data.broker_booking_db import BrokerBookingDB
        _broker_db = BrokerBookingDB()
    return _broker_db


def get_live_scraper():
    global _live_scraper
    if _live_scraper is None:
        from src.data.live_bengaluru_scraper import LiveBengaluruPropertyScraper
        _live_scraper = LiveBengaluruPropertyScraper()
    return _live_scraper


def _run_bengaluru_rent_sync() -> None:
    """Syncs bengaluru.rent listings without blocking server startup or health checks."""
    print("🚀 Auto-syncing bengaluru.rent rental listings in background...")
    try:
        manager = get_dialogue_manager()
        get_live_scraper().run_live_scraper_sync()
        manager.listings_db.reload()
        manager.active_shortlist = manager.listings_db.get_all_active_listings()
        print(f"✅ Backend auto-sync complete! Active Rental Properties: {len(manager.active_shortlist)}")
    except Exception as e:
        print(f"Notice during backend auto-sync: {e}")


@app.on_event("startup")
def auto_sync_bengaluru_rent_listings():
    """Kick off listing sync in a daemon thread so /api/health is available immediately."""
    manifest_path = os.path.join(os.path.dirname(__file__), "../../data/dataset_manifest.json")
    if os.path.exists(manifest_path):
        print("Using curated instructor dataset (data/dataset_manifest.json) — skipping auto-sync.")
        return
    if os.getenv("AUTO_SYNC_ON_STARTUP", "true").lower() == "false":
        print("Skipping bengaluru.rent auto-sync (AUTO_SYNC_ON_STARTUP=false)")
        return

    threading.Thread(
        target=_run_bengaluru_rent_sync,
        daemon=True,
        name="bengaluru-rent-sync",
    ).start()


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
    return {"status": "healthy", "version": app.version}


@app.get("/api/sources")
def get_sources():
    """Returns grounded source taxonomy from Docs/sources.jsonl for the Sources drawer."""
    path = os.path.join(os.path.dirname(__file__), "../../Docs/sources.jsonl")
    sources = []
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    sources.append(json.loads(line))
    return {"count": len(sources), "sources": sources}


@app.get("/api/dataset-manifest")
def get_dataset_manifest():
    path = os.path.join(os.path.dirname(__file__), "../../data/dataset_manifest.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="dataset_manifest.json not found")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/localities")
def get_localities():
    from src.data.locality_resolver import get_canonical_localities

    return {"count": len(get_canonical_localities()), "localities": list(get_canonical_localities())}


@app.get("/api/listings")
def get_listings():
    manager = get_dialogue_manager()
    all_listings = manager.listings_db.get_all_active_listings()
    return {
        "active_persona": manager.current_persona.value,
        "count": len(all_listings),
        "listings": all_listings
    }


@app.post("/api/scraper/run")
def run_live_scraper(req: ScraperRequest = ScraperRequest()):
    """Triggers live real-time Bengaluru property web scraper, scrubs PII, and reloads listings DB."""
    manager = get_dialogue_manager()
    res = get_live_scraper().run_live_scraper_sync(req.locality)
    # Sync dialogue manager shortlist with newly scraped database
    manager.listings_db.reload()
    manager.active_shortlist = manager.listings_db.get_all_active_listings()
    return res


@app.get("/api/brokers")
def get_brokers():
    """Returns list of all 8 brokers and booking counts."""
    return {
        "count": 8,
        "brokers": get_broker_db().get_all_brokers()
    }


@app.get("/api/brokers/availability")
def check_broker_availability(visit_date: str, time_slot: str = "10:00 AM - 11:00 AM"):
    """Returns free brokers for specified date and time slot."""
    free_brokers = get_broker_db().get_available_brokers(visit_date, time_slot)
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
        
    response = get_dialogue_manager().process_voice_turn(req.user_query, req.active_locality)
    return response


@app.post("/api/persona/switch")
def switch_persona(req: PersonaSwitchRequest):
    return get_dialogue_manager().switch_persona(req.persona)


@app.post("/api/seller/intake")
def seller_intake(req: SellerIntakeRequest):
    return get_dialogue_manager().process_seller_intake(
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
    booking_res = get_broker_db().book_site_visit(
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
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

