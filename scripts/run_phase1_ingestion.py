"""
Verification Script for Phase 1 Implementation.
Validates:
  1. PII Scrubbing on property listings
  2. Property Database active filtering
  3. Ingestion of 4 Knowledge Base files into ChromaDB using BAAI/bge-small-en-v1.5 (FastEmbed)
  4. Vector search & metadata verification
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.data.pii_scrubber import sanitize_listing
from src.data.listings_db import PropertyListingsDB
from src.grounding.kb_ingestor import KnowledgeBaseIngestor


def test_pii_scrubber():
    print("\n--- Testing PII Scrubber ---", flush=True)
    dirty_listing = {
        "listing_id": "test_001",
        "society_name": "Test Residency",
        "owner_name": "John Doe",
        "owner_phone": "+91 9876543210",
        "owner_email": "john.doe@example.com",
        "description": "Contact agent Sharma at 9123456789 or agent@realty.com for details."
    }
    
    clean = sanitize_listing(dirty_listing)
    print(f"Original Dirty Keys: {list(dirty_listing.keys())}", flush=True)
    print(f"Clean Keys: {list(clean.keys())}", flush=True)
    print(f"Clean Description: {clean['description']}", flush=True)
    
    assert "owner_name" not in clean, "owner_name should be stripped!"
    assert "owner_phone" not in clean, "owner_phone should be stripped!"
    assert "[REDACTED_PHONE]" in clean["description"], "Phone in text should be redacted!"
    assert "[REDACTED_EMAIL]" in clean["description"], "Email in text should be redacted!"
    print("✅ PII Scrubber Test Passed!", flush=True)


def test_listings_db():
    print("\n--- Testing Property Listings Database ---", flush=True)
    db = PropertyListingsDB(data_path="data/listings.json")
    active = db.get_all_active_listings()
    print(f"Loaded {len(active)} active, PII-clean property listings.", flush=True)
    
    # Test Filtering
    kora_rents = db.filter_listings(locality="Koramangala", max_price=40000, listing_type="rent")
    print(f"Filtered Koramangala Rent <= 40k: Found {len(kora_rents)} listings.", flush=True)
    assert len(kora_rents) > 0, "Should find Koramangala active rental listings!"
    print("✅ Property Listings DB Test Passed!", flush=True)


def test_kb_ingestion():
    print("\n--- Testing Knowledge Base Ingestion (BAAI/bge-small-en-v1.5 + ChromaDB) ---", flush=True)
    ingestor = KnowledgeBaseIngestor(docs_dir="Docs", db_dir="data/chroma_db")
    total_chunks = ingestor.ingest_all()
    
    # Run a test vector search query using FastEmbed (BAAI/bge-small-en-v1.5)
    print("\nRunning test semantic query for: 'What is Indiranagar like?'", flush=True)
    query_text = "What is Indiranagar like?"
    raw_query = list(ingestor.embedding_model.embed([query_text]))[0]
    query_embedding = [float(val) for val in raw_query]
    
    results = ingestor.collection.query(
        query_embeddings=[query_embedding],
        n_results=2
    )
    
    print("\nSearch Results:", flush=True)
    for i, (doc, meta) in enumerate(zip(results["documents"][0], results["metadatas"][0])):
        print(f"\nResult #{i+1} [Doc ID: {meta['doc_id']} | Source: {meta['source_name']}]:", flush=True)
        print(f"Snippet: {doc[:150]}...", flush=True)
        print(f"Metadata: Locality={meta['locality']}, DoNotInfer={meta.get('do_not_infer')}", flush=True)
        
    assert len(results["documents"][0]) > 0, "Vector search should return relevant chunks!"
    print("\n✅ Knowledge Base Ingestion & Vector Search Test Passed!", flush=True)


if __name__ == "__main__":
    test_pii_scrubber()
    test_listings_db()
    test_kb_ingestion()
    print("\n🎉 ALL PHASE 1 TESTS PASSED SUCCESSFULLY!", flush=True)
