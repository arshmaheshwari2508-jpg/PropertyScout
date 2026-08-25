"""
Verification Script for Phase 4: Google MCP Client & 8-Broker Collision Avoidance Engine.

Validates:
  1. Initialization of 8 property brokers in SQLite database.
  2. Google MCP Client Calendar event creation & URL template generation.
  3. Successful site visit creation with assigned free broker.
  4. Collision Avoidance Algorithm:
     - 8 bookings for the SAME date & time slot fill all 8 brokers without double-booking.
     - 9th booking for the SAME slot is cleanly rejected with ALL_BROKERS_BUSY error.
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.grounding.google_mcp_client import GoogleMCPClient
from src.data.broker_booking_db import BrokerBookingDB
from src.api.email_service import send_site_visit_email


def test_broker_db_init():
    print("\n--- 1. Testing Broker DB Initialization ---", flush=True)
    db = BrokerBookingDB()
    brokers = db.get_all_brokers()
    print(f"Total brokers seeded in SQLite: {len(brokers)}")
    assert len(brokers) == 8, f"Expected 8 brokers, got {len(brokers)}"
    for b in brokers:
        print(f"  • Broker #{b['id']}: {b['name']} ({b['specialization']}) - Rating: ★ {b['rating']}")
    print("✅ Broker DB Initialization Test Passed!", flush=True)


def test_google_mcp_client():
    print("\n--- 2. Testing Google MCP Client ---", flush=True)
    client = GoogleMCPClient()
    res = client.create_calendar_event(
        title="🏡 Site Visit: Prestige Silver Oak",
        description="Site visit inspection",
        locality="Whitefield",
        visit_date="2026-08-25",
        time_slot="10:00 AM - 11:00 AM",
        user_name="Arsh Maheshwari",
        user_email="arsh@example.com",
        broker_name="Amit Patel",
        broker_email="amit.patel@scout.ai"
    )
    print(f"MCP Tool Used: {res['tool_used']}")
    print(f"Event ID Generated: {res['event_id']}")
    print(f"Google Calendar Web Sync Link: {res['calendar_html_link']}")
    assert res["status"] == "success", "Google MCP event creation failed!"
    assert "https://calendar.google.com" in res["calendar_html_link"], "Google Calendar URL missing!"
    print("✅ Google MCP Client Test Passed!", flush=True)


def test_broker_collision_avoidance():
    print("\n--- 3. Testing 8-Broker Collision Avoidance Algorithm ---", flush=True)
    # Use isolated test DB
    test_db_path = os.path.abspath("data/test_scout_bookings.db")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        
    db = BrokerBookingDB(db_path=test_db_path)
    test_date = "2026-09-01"
    test_slot = "10:00 AM - 11:00 AM"

    assigned_brokers = set()

    # Step A: Book 8 consecutive visits for the SAME slot
    print(f"Attempting 8 consecutive bookings for date '{test_date}' @ '{test_slot}'...")
    for i in range(1, 9):
        res = db.book_site_visit(
            user_name=f"Customer #{i}",
            user_email=f"customer{i}@example.com",
            phone=f"+91 987654320{i}",
            visit_date=test_date,
            time_slot=test_slot,
            property_title=f"Luxury Villa #{i}",
            locality="Koramangala",
            price="₹2.5 Cr"
        )
        assert res["success"] is True, f"Booking #{i} should have succeeded!"
        assigned_broker_id = res["broker"]["id"]
        assigned_brokers.add(assigned_broker_id)
        print(f"  ✓ Booking #{i} assigned to Broker #{assigned_broker_id}: {res['broker']['name']}")

    # Verify that all 8 distinct brokers were assigned without double-booking
    print(f"Unique brokers assigned across 8 bookings: {len(assigned_brokers)} / 8")
    assert len(assigned_brokers) == 8, "Expected 8 distinct brokers assigned for 8 bookings!"

    # Step B: Attempt 9th booking for the SAME slot (All brokers are now busy)
    print("\nAttempting 9th booking for the SAME fully-booked time slot...")
    res_9th = db.book_site_visit(
        user_name="Customer #9 (Overflow)",
        user_email="overflow@example.com",
        phone="+91 9876543209",
        visit_date=test_date,
        time_slot=test_slot,
        property_title="Overflow Apartment",
        locality="Koramangala",
        price="₹1.2 Cr"
    )

    print(f"9th Booking Result: Success={res_9th['success']}, Error='{res_9th.get('error')}'")
    print(f"Message: '{res_9th.get('message')}'")
    assert res_9th["success"] is False, "9th booking MUST fail when all 8 brokers are busy!"
    assert res_9th["error"] == "ALL_BROKERS_BUSY", "Error code must be ALL_BROKERS_BUSY!"

    # Clean up test DB
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    print("✅ 8-Broker Collision Avoidance Algorithm Test Passed!", flush=True)


def test_email_service_integration():
    print("\n--- 4. Testing HTML Email Service Integration ---", flush=True)
    res = send_site_visit_email(
        user_name="Arsh Maheshwari",
        user_email="arsh@example.com",
        visit_date="2026-08-25",
        time_slot="10:00 AM - 11:00 AM",
        property_title="Sobha Royal Pavilion",
        locality="HSR Layout",
        price="₹1.85 Cr",
        broker_name="Vikram Reddy",
        broker_phone="+91 98765 11004",
        broker_email="vikram.reddy@scout.ai",
        calendar_link="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Site+Visit"
    )
    print(f"Email Dispatch Result: {res['message']}")
    assert res["success"] is True, "Email dispatch result must indicate success!"
    print("✅ HTML Email Integration Test Passed!", flush=True)


if __name__ == "__main__":
    test_broker_db_init()
    test_google_mcp_client()
    test_broker_collision_avoidance()
    test_email_service_integration()
    print("\n🎉 ALL PHASE 4 GOOGLE MCP & 8-BROKER VERIFICATION TESTS PASSED!", flush=True)
