"""
Targeted Shortlist Delta Engine for Voice-First AI Property Scout.
Executes voice edits (e.g. "drop properties above 40k", "only show 3BHKs", "remove non-furnished")
targeting only affected listings without re-evaluating or disturbing untouched entries.
Returns detailed delta payloads: {"added": [...], "removed": [...], "current_shortlist": [...]}.
"""

import re
from typing import List, Dict, Any, Tuple


class ShortlistDeltaEngine:
    @staticmethod
    def parse_delta_command(command: str) -> Dict[str, Any]:
        """
        Parses a voice edit command into structured delta filtering rules.
        """
        cmd_clean = command.strip().lower()
        delta_action = {}

        # 1. Price cap removal (e.g. "drop properties above 40k", "drop everything above ₹40k")
        max_price_match = re.search(
            r'(?:drop|remove|filter out|above|over|more than|exceeding).*?(?:₹|rs\.?)?\s*(\d+)\s*(k|lakh)?',
            cmd_clean
        )
        if max_price_match:
            val = float(max_price_match.group(1))
            unit = max_price_match.group(2)
            if unit == 'k':
                val *= 1000
            elif unit == 'lakh':
                val *= 100000
            delta_action["max_price_cutoff"] = val

        # 2. Bedroom requirement (e.g. "only show 3BHKs", "keep 2 BHK")
        bhk_match = re.search(r'(\d+)\s*bhk', cmd_clean)
        if bhk_match:
            delta_action["required_bhk"] = int(bhk_match.group(1))

        # 3. Furnishing filter (e.g. "only fully furnished", "drop unfurnished")
        if "fully furnished" in cmd_clean:
            delta_action["furnishing"] = "Fully Furnished"
        elif "semi furnished" in cmd_clean or "semi-furnished" in cmd_clean:
            delta_action["furnishing"] = "Semi-Furnished"

        # 4. Locality removal or keep (e.g. "remove Indiranagar", "only Koramangala")
        if "remove indiranagar" in cmd_clean or "drop indiranagar" in cmd_clean:
            delta_action["exclude_locality"] = "Indiranagar"
        elif "remove whitefield" in cmd_clean or "drop whitefield" in cmd_clean:
            delta_action["exclude_locality"] = "Whitefield"

        return delta_action

    @classmethod
    def apply_delta(
        cls,
        current_shortlist: List[Dict[str, Any]],
        voice_command: str
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Applies a voice edit command to an existing shortlist array, returning
        the updated shortlist and an explicit delta diff payload.
        """
        delta_rule = cls.parse_delta_command(voice_command)
        
        kept = []
        removed = []

        for item in current_shortlist:
            should_remove = False
            price = item.get("rent_inr") or item.get("sale_price_inr") or 0
            
            # Check price cutoff
            if "max_price_cutoff" in delta_rule and price > delta_rule["max_price_cutoff"]:
                should_remove = True
                
            # Check BHK requirement
            if "required_bhk" in delta_rule and item.get("bedrooms", 0) != delta_rule["required_bhk"]:
                should_remove = True
                
            # Check furnishing requirement
            if "furnishing" in delta_rule and delta_rule["furnishing"].lower() not in item.get("furnishing", "").lower():
                should_remove = True

            # Check locality exclusion
            if "exclude_locality" in delta_rule and delta_rule["exclude_locality"].lower() in item.get("locality", "").lower():
                should_remove = True

            if should_remove:
                removed.append(item)
            else:
                kept.append(item)

        delta_payload = {
            "voice_command": voice_command,
            "rule_applied": delta_rule,
            "added": [],
            "removed": removed,
            "removed_ids": [x["listing_id"] for x in removed],
            "kept_count": len(kept),
            "removed_count": len(removed)
        }

        return kept, delta_payload
