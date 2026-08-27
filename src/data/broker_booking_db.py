"""
Broker Site Visit Database & Collision Avoidance Management.
Manages a persistent SQLite database for 8 property brokers and enforces zero double-booking
for site visits across time slots. Connects with GoogleMCPClient for Google Calendar sync.
"""

import os
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
from src.grounding.google_mcp_client import GoogleMCPClient

_DEFAULT_DB = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/scout_bookings.db"))
DB_PATH = os.path.abspath(os.getenv("BOOKINGS_DB_PATH", _DEFAULT_DB))

INITIAL_BROKERS = [
    (1, "Rajesh Sharma", "rajesh.sharma@scout.ai", "+91 98765 11001", "Indiranagar", 4.90),
    (2, "Priya Nair", "priya.nair@scout.ai", "+91 98765 11002", "Koramangala", 4.85),
    (3, "Amit Patel", "amit.patel@scout.ai", "+91 98765 11003", "Whitefield", 4.92),
    (4, "Vikram Reddy", "vikram.reddy@scout.ai", "+91 98765 11004", "HSR Layout", 4.88),
    (5, "Sneha Gupta", "sneha.gupta@scout.ai", "+91 98765 11005", "Jayanagar", 4.95),
    (6, "Suresh Kumar", "suresh.kumar@scout.ai", "+91 98765 11006", "Mahadevapura", 4.79),
    (7, "Ananya Roy", "ananya.roy@scout.ai", "+91 98765 11007", "Hebbal", 4.91),
    (8, "Deepak Verma", "deepak.verma@scout.ai", "+91 98765 11008", "JP Nagar", 4.86)
]

STANDARD_TIME_SLOTS = [
    "10:00 AM - 11:00 AM",
    "11:30 AM - 12:30 PM",
    "02:00 PM - 03:00 PM",
    "04:00 PM - 05:00 PM"
]


class BrokerBookingDB:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initializes tables and seeds 8 brokers if empty."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Create Brokers table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS brokers (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    specialization TEXT NOT NULL,
                    rating REAL NOT NULL
                )
            """)

            # 2. Create Site Visits table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS site_visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_name TEXT NOT NULL,
                    user_email TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    property_title TEXT NOT NULL,
                    locality TEXT NOT NULL,
                    price TEXT NOT NULL,
                    visit_date TEXT NOT NULL,
                    time_slot TEXT NOT NULL,
                    assigned_broker_id INTEGER NOT NULL,
                    google_calendar_event_id TEXT,
                    calendar_html_link TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (assigned_broker_id) REFERENCES brokers (id)
                )
            """)

            # 3. Seed 8 Brokers if table is empty
            cursor.execute("SELECT COUNT(*) FROM brokers")
            if cursor.fetchone()[0] == 0:
                cursor.executemany("""
                    INSERT INTO brokers (id, name, email, phone, specialization, rating)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, INITIAL_BROKERS)
            
            conn.commit()

    def get_all_brokers(self) -> List[Dict[str, Any]]:
        """Returns all 8 property brokers with current booking counts."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT b.*, COUNT(v.id) as total_bookings
                FROM brokers b
                LEFT JOIN site_visits v ON b.id = v.assigned_broker_id
                GROUP BY b.id
                ORDER BY b.id ASC
            """)
            return [dict(row) for row in cursor.fetchall()]

    def get_available_brokers(self, visit_date: str, time_slot: str) -> List[Dict[str, Any]]:
        """
        Returns list of brokers who are FREE for the specified visit_date and time_slot.
        Filters out any broker who already has a booking in site_visits for that slot.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM brokers
                WHERE id NOT IN (
                    SELECT assigned_broker_id 
                    FROM site_visits 
                    WHERE visit_date = ? AND time_slot = ?
                )
                ORDER BY rating DESC
            """, (visit_date, time_slot))
            return [dict(row) for row in cursor.fetchall()]

    def book_site_visit(
        self,
        user_name: str,
        user_email: str,
        phone: str,
        visit_date: str,
        time_slot: str,
        property_title: str,
        locality: str,
        price: str = "N/A"
    ) -> Dict[str, Any]:
        """
        Attempts to book a site visit by checking broker availability.
        Enforces collision avoidance across all 8 brokers.
        """
        # Validate or default time_slot
        slot = time_slot if time_slot in STANDARD_TIME_SLOTS else STANDARD_TIME_SLOTS[0]
        
        # Check free brokers for date + slot
        free_brokers = self.get_available_brokers(visit_date, slot)

        if not free_brokers:
            return {
                "success": False,
                "error": "ALL_BROKERS_BUSY",
                "message": f"All 8 property brokers are fully booked for {slot} on {visit_date}. Please choose another time slot or date.",
                "visit_date": visit_date,
                "time_slot": slot
            }

        # Select broker: prefer locality specialization match, or highest-rated free broker
        matched_broker = next(
            (b for b in free_brokers if b["specialization"].lower() == locality.lower()),
            free_brokers[0]
        )

        # Sync with Google Calendar MCP Client
        google_client = GoogleMCPClient()
        event_title = f"🏡 Site Visit: {property_title} [{user_name}]"
        event_desc = f"Site visit for {property_title} in {locality} (Price: {price}). Client: {user_name} ({phone})."
        
        gcal_mcp_result = google_client.create_calendar_event(
            title=event_title,
            description=event_desc,
            locality=locality,
            visit_date=visit_date,
            time_slot=slot,
            user_name=user_name,
            user_email=user_email,
            broker_name=matched_broker["name"],
            broker_email=matched_broker["email"]
        )

        gcal_event_id = gcal_mcp_result.get("event_id", "")
        calendar_link = gcal_mcp_result.get("calendar_html_link", "")

        # Insert record into SQLite DB
        created_at = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO site_visits (
                    user_name, user_email, phone, property_title, locality, price,
                    visit_date, time_slot, assigned_broker_id, google_calendar_event_id,
                    calendar_html_link, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_name, user_email, phone, property_title, locality, price,
                visit_date, slot, matched_broker["id"], gcal_event_id,
                calendar_link, created_at
            ))
            conn.commit()
            booking_id = cursor.lastrowid

        return {
            "success": True,
            "booking_id": f"BK-{booking_id:05d}",
            "visit_date": visit_date,
            "time_slot": slot,
            "property_title": property_title,
            "locality": locality,
            "price": price,
            "broker": matched_broker,
            "google_calendar": {
                "event_id": gcal_event_id,
                "calendar_html_link": calendar_link,
                "mcp_status": "synced"
            }
        }
