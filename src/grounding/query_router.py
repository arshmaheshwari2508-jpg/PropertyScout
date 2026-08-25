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
    r'(recipe|cook|biryani|weather|capital of|president|prime minister|politics|cricket|football|movie|song|poem|joke|code|python|java|javascript|algorithm|stock market|bitcoin|crypto)',
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

        return None

