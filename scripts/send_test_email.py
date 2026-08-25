"""
Test Email & Site Visit Confirmation Script.
Dispatches confirmation email to arshmaheshwari2508@gmail.com for 20 August 12 PM with Broker Amit Patel.
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.data.broker_booking_db import BrokerBookingDB
from src.api.email_service import send_site_visit_email


def send_confirmation():
    print("\n--- Dispatching Test Site Visit Email via Live Gmail API ---", flush=True)
    db = BrokerBookingDB()

    user_name = "Arsh Maheshwari"
    user_email = "arshmaheshwari2508@gmail.com"
    visit_date = "2026-08-20"
    time_slot = "12:00 PM - 01:00 PM"
    property_title = "Prestige Lakeside Villa"
    locality = "Whitefield"
    price = "₹2.75 Cr"

    # Create site visit booking in DB
    res = db.book_site_visit(
        user_name=user_name,
        user_email=user_email,
        phone="+91 9876543210",
        visit_date=visit_date,
        time_slot=time_slot,
        property_title=property_title,
        locality=locality,
        price=price
    )

    print(f"Booking Status: Success={res['success']}, Booking ID={res.get('booking_id')}")
    broker_info = res.get("broker", {})
    gcal_info = res.get("google_calendar", {})

    print(f"Assigned Broker: Amit Patel (+91 98765 11003)")
    print(f"Google Calendar Sync Link: {gcal_info.get('calendar_html_link')}")

    # Dispatch email via Gmail API
    email_res = send_site_visit_email(
        user_name=user_name,
        user_email=user_email,
        visit_date=visit_date,
        time_slot=time_slot,
        property_title=property_title,
        locality=locality,
        price=price,
        broker_name="Amit Patel",
        broker_phone="+91 98765 11003",
        broker_email="amit.patel@scout.ai",
        calendar_link=gcal_info.get("calendar_html_link", "")
    )

    print(f"\nGmail API Dispatch Result:\n  Status: {email_res}")
    return email_res


if __name__ == "__main__":
    send_confirmation()
