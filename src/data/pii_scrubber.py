"""
PII Scrubbing Engine for Voice-First AI Property Scout.
Strips Personally Identifiable Information (PII) including phone numbers, email addresses,
and owner/agent names from raw property listings before database ingestion.
"""

import re
from typing import Dict, Any, List, Union

# Robust regex patterns for Indian mobile numbers, landlines with STD codes, emails, and contact handles
PHONE_PATTERN = re.compile(
    r'(\+91[\-\s]?)?(\(?0?\d{2,4}\)?[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}|\b\d{10}\b|\b0\d{2,4}[\-\s]?\d{6,8}\b'
)
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
CONTACT_KEY_PATTERN = re.compile(r'(owner|agent|contact|phone|mobile|email|whatsapp|dealer|broker_name)', re.IGNORECASE)


def sanitize_text(entry: str) -> str:
    """Removes phone numbers and emails from a string entry, skipping URLs."""
    if not isinstance(entry, str) or entry.startswith('http://') or entry.startswith('https://'):
        return entry
    
    # Redact email addresses
    redacted = EMAIL_PATTERN.sub('[REDACTED_EMAIL]', entry)
    # Redact phone numbers
    redacted = PHONE_PATTERN.sub('[REDACTED_PHONE]', redacted)
    return redacted


def sanitize_listing(listing: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitizes a property listing dictionary by stripping contact fields and scrubbing text fields.
    """
    sanitized = {}
    
    for key, value in listing.items():
        # Remove PII contact keys completely
        if CONTACT_KEY_PATTERN.search(key):
            continue
            
        if isinstance(value, str):
            sanitized[key] = sanitize_text(value)
        elif isinstance(value, list):
            sanitized[key] = [sanitize_text(item) if isinstance(item, str) else item for item in value]
        elif isinstance(value, dict):
            sanitized[key] = sanitize_listing(value)
        else:
            sanitized[key] = value
            
    # Explicitly set contact fields to PII-free reference
    sanitized["contact_type"] = "Platform Agent"
    sanitized["contact_ref"] = f"REF-{sanitized.get('listing_id', 'UNKNOWN')}"
    
    return sanitized


def sanitize_listings_batch(listings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sanitizes a batch of property listings."""
    return [sanitize_listing(item) for item in listings]
