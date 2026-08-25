#!/usr/bin/env python3
"""
CLI Runner for Live Bengaluru Real Estate Scraper.
Run: python3 scripts/run_live_scraper.py [locality]
"""

import sys
import json
import os

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.data.live_bengaluru_scraper import LiveBengaluruPropertyScraper

def main():
    locality = sys.argv[1] if len(sys.argv) > 1 else None
    print(f"=== Live Bengaluru Real Estate Scraper Runner ===")
    if locality:
        print(f"Target Locality Filter: {locality}")
    else:
        print("Target Locality: All Bengaluru Zones")

    scraper = LiveBengaluruPropertyScraper()
    res = scraper.run_live_scraper_sync(locality)

    print("\n--- Scraped Live Results Summary ---")
    print(f"Status: {res['status']}")
    print(f"Scraped Items Count: {res['scraped_count']}")
    print(f"Newly Ingested: {res['newly_added']}")
    print(f"Total Database Active Listings: {res['total_active_listings']}")
    print("\nSample Scraped Property:")
    if res['listings']:
        print(json.dumps(res['listings'][0], indent=2))

if __name__ == "__main__":
    main()
