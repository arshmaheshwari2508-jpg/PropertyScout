"""
Property Listings Database Engine for Voice-First AI Property Scout.
Manages active property listings scraped from bengaluru.rent and submitted by users.
Excludes inactive / sold listings and enforces PII sanitization.
"""

import json
import os
from typing import List, Dict, Any, Optional
from src.data.pii_scrubber import sanitize_listings_batch, sanitize_listing


class PropertyListingsDB:
    def __init__(self, data_path: str = "data/listings.json"):
        self.data_path = data_path
        self._listings: List[Dict[str, Any]] = []
        self.reload()

    def reload(self):
        """Loads and sanitizes property listings from JSON file."""
        if os.path.exists(self.data_path):
            with open(self.data_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
            # Apply PII scrubbing and pre-filter active listings
            sanitized = sanitize_listings_batch(raw_data)
            self._listings = [
                item for item in sanitized
                if item.get("availability_status", "").lower() in ["available", "ready"]
            ]
        else:
            self._listings = []

    def get_all_active_listings(self) -> List[Dict[str, Any]]:
        """Returns all active, PII-scrubbed property listings."""
        return self._listings

    def add_seller_listing(self, new_listing: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitizes and appends a new user/seller listing to the database."""
        sanitized_item = sanitize_listing(new_listing)
        if "listing_id" not in sanitized_item:
            sanitized_item["listing_id"] = f"user_list_{len(self._listings) + 1001}"
        sanitized_item["availability_status"] = "Available"
        
        self._listings.append(sanitized_item)
        
        # Save back to file
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(self._listings, f, indent=2)
            
        return sanitized_item

    def filter_listings(
        self,
        locality: Optional[str] = None,
        max_price: Optional[float] = None,
        min_bedrooms: Optional[int] = None,
        exact_bedrooms: Optional[int] = None,
        listing_type: Optional[str] = None,
        furnishing: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Filters active listings according to parameters.
        """
        results = self._listings
        
        if listing_type:
            results = [x for x in results if x.get("listing_type", "").lower() == listing_type.lower()]
            
        if locality:
            loc_query = locality.lower()
            results = [x for x in results if loc_query in x.get("locality", "").lower() or loc_query in x.get("society_name", "").lower()]
            
        if exact_bedrooms is not None:
            try:
                target_bhk = int(exact_bedrooms)
                results = [x for x in results if int(x.get("bedrooms", 0)) == target_bhk]
            except (ValueError, TypeError):
                pass
        elif min_bedrooms:
            results = [x for x in results if x.get("bedrooms", 0) >= min_bedrooms]
            
        if max_price:
            filtered = []
            for item in results:
                price = item.get("rent_inr") if item.get("listing_type", "rent").lower() == "rent" else item.get("sale_price_inr")
                if price is None:
                    price = item.get("rent_inr") or item.get("sale_price_inr")
                if price and price > 0 and price <= max_price:
                    filtered.append(item)
            results = filtered

        if furnishing:
            furn_query = furnishing.lower()
            results = [x for x in results if furn_query in x.get("furnishing", "").lower()]

        return results

