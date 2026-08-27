"""
Intent Query Router for Voice-First AI Property Scout.
Enforces strict 4-Layer Separation of Responsibilities:
  Layer 1: LISTING_PRICING_QUERY -> bengaluru.rent Listings DB (Never queried from RAG)
  Layer 2: LIVE_TRANSIT_POI_QUERY -> OpenStreetMap MCP Server (Never queried from RAG)
  Layer 3: NEIGHBORHOOD_CONTEXT_QUERY -> Weighted RAG Vector Engine
  Layer 4: CRIME_SAFETY_EVIDENCE_QUERY -> Safety Evidence Engine (Non-binary safety)
"""

import re
from enum import Enum
from typing import Dict, Any, Optional


class QueryIntent(str, Enum):
    LISTING_PRICING = "LISTING_PRICING"
    LIVE_TRANSIT_POI = "LIVE_TRANSIT_POI"
    NEIGHBORHOOD_CONTEXT = "NEIGHBORHOOD_CONTEXT"
    CRIME_SAFETY = "CRIME_SAFETY"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


# Intent matching keyword and regex patterns
PRICING_PATTERNS = re.compile(
    r'(\b\d*\s*bhk\b|rent|rental|price|pricing|deposit|cost|available|buy|sale|sqft|possession|rera|listing|apartment|flat|house|home|room|under\s*\d+|budget)',
    re.IGNORECASE
)

TRANSIT_POI_PATTERNS = re.compile(
    r'(metro|distance|how far|transit|bus stop|bus station|hospital|school|park|supermarket|poi|kilometers|\bkm\b|walk|commute|station)',
    re.IGNORECASE
)

SAFETY_PATTERNS = re.compile(
    r'(safe|safety|crime|police|night|security|safe for women|theft|safe area)',
    re.IGNORECASE
)

OFF_TOPIC_PATTERNS = re.compile(
    r'(recipe|cook|biryani|weather|capital of|president|prime minister|politics|cricket|football|movie|song|poem|joke|code|python|java|javascript|algorithm|stock market|bitcoin|crypto|flight|airline|airport|book me a trip|travel booking)',
    re.IGNORECASE
)

PURCHASE_PATTERNS = re.compile(
    r'(\bbuy\b|\bbuying\b|\bbuyer\s+mode\b|\bpurchase\b|\bfor\s+sale\b|\bsale\s+price\b|\bhome\s+purchase\b|\bown\s+a\s+(?:home|house|flat|property)\b)',
    re.IGNORECASE
)


class IntentQueryRouter:
    @staticmethod
    def classify_intent(query: str) -> QueryIntent:
        """
        Classifies user query intent into one of the 4 separation layers or OUT_OF_SCOPE.
        """
        query_clean = query.strip().lower()

        # Check explicit off-topic patterns first
        if OFF_TOPIC_PATTERNS.search(query_clean):
            return QueryIntent.OUT_OF_SCOPE

        # Purchase / sale intent is out of scope — platform is rental-only
        if IntentQueryRouter.is_purchase_intent(query_clean):
            return QueryIntent.OUT_OF_SCOPE

        # Check Safety intent
        if SAFETY_PATTERNS.search(query_clean):
            return QueryIntent.CRIME_SAFETY

        # Check Spatial Transit & Metro distance intent
        if TRANSIT_POI_PATTERNS.search(query_clean):
            return QueryIntent.LIVE_TRANSIT_POI

        # Check Active Property Listings & Rents intent
        if PRICING_PATTERNS.search(query_clean):
            return QueryIntent.LISTING_PRICING

        # Check if locality or Bengaluru real estate term is present
        has_locality = IntentQueryRouter.extract_locality_mention(query_clean) is not None
        has_bengaluru = "bengaluru" in query_clean or "bangalore" in query_clean or "area" in query_clean or "locality" in query_clean or "neighborhood" in query_clean

        if has_locality or has_bengaluru:
            return QueryIntent.NEIGHBORHOOD_CONTEXT

        # If query has no relation to real estate or Bengaluru, classify as OUT_OF_SCOPE
        return QueryIntent.OUT_OF_SCOPE

    @staticmethod
    def is_purchase_intent(query: str) -> bool:
        """Returns True when the user is asking to buy / purchase property (rental-only platform)."""
        if not query:
            return False
        return bool(PURCHASE_PATTERNS.search(query.strip()))

    @staticmethod
    def is_rental_intent(query: str) -> bool:
        """Returns True when the user explicitly wants to rent (not buy)."""
        if not query:
            return False
        text = query.strip().lower()
        if IntentQueryRouter.is_purchase_intent(text):
            return False
        return bool(re.search(
            r'\b(rent|rental|renting|lease|leasing|for rent|to rent|looking to rent|want to rent|need to rent)\b',
            text,
            re.IGNORECASE
        ))

    @staticmethod
    def extract_locality_mention(query: str) -> Optional[str]:
        """
        Extracts locality name from query string.
        """
        known_localities = [
            "Indiranagar", "Koramangala", "HSR Layout", "Whitefield",
            "Mahadevapura", "Jayanagar", "J P Nagar", "Malleshwaram",
            "Hebbal", "Bellandur", "Marathahalli", "Sarjapur Road"
        ]
        
        for loc in known_localities:
            if loc.lower() in query.lower():
                return loc
                
        return None

    @staticmethod
    def extract_max_budget_inr(query: str) -> Optional[float]:
        """
        Extracts max price budget in INR from query string (e.g. 5 Cr, 50 Lakhs, 40k).
        """
        query_clean = query.lower()
        # Crores (e.g. 5 crore, 5.5 cr, 5cr)
        cr_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b', query_clean)
        if cr_match:
            return float(cr_match.group(1)) * 10_000_000.0

        # Lakhs (e.g. 50 lakhs, 1.5 lakh, 50l)
        lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b', query_clean)
        if lakh_match:
            return float(lakh_match.group(1)) * 100_000.0

        # Thousands / K (e.g. 40k, 50 thousand)
        k_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:k|thousand)\b', query_clean)
        if k_match:
            return float(k_match.group(1)) * 1000.0

        # Plain INR amounts (e.g. under 40000, under 1000, 50000 rupees)
        under_match = re.search(
            r'(?:under|below|upto|up to|max|maximum|within|less than)\s*(?:₹|rs\.?|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)',
            query_clean
        )
        if under_match:
            return float(under_match.group(1).replace(',', ''))

        rupee_match = re.search(r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr)\b', query_clean)
        if rupee_match:
            return float(rupee_match.group(1).replace(',', ''))

        return None

    @staticmethod
    def extract_bhk_from_query(query: str) -> Optional[int]:
        """Extracts bedroom / BHK count (1-4) from a query string."""
        if not query:
            return None
        q = query.lower().replace("-", " ")

        bhk_explicit = re.search(r'\b([1-4])\s*bhk\b', q)
        if bhk_explicit:
            return int(bhk_explicit.group(1))

        bedroom_match = re.search(r'\b([1-4])\s*(?:bedroom|bedrooms)\b', q)
        if bedroom_match:
            return int(bedroom_match.group(1))

        word_map = {"one": 1, "two": 2, "three": 3, "four": 4}
        for word, num in word_map.items():
            if re.search(rf'\b{word}\s*(?:bhk|bedroom|bedrooms)?\b', q):
                return num

        return None

