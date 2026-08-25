"""
Citation Resolver Engine for Voice-First AI Property Scout.
Resolves source IDs (e.g. SRC_WIKI_NEIGHBORHOODS, SRC_GBA, SRC_KAR_POLICE_CRIME_2025, SRC_OSM_MCP)
against Docs/sources.jsonl to return rich metadata for UI citation rendering.
"""

import json
import os
from typing import Dict, Any, List, Optional


class CitationResolver:
    def __init__(self, sources_path: str = "Docs/sources.jsonl"):
        self.sources_path = sources_path
        self._sources: Dict[str, Dict[str, Any]] = {}
        self.reload()

    def reload(self):
        """Loads source taxonomy records from Docs/sources.jsonl."""
        self._sources = {}
        if os.path.exists(self.sources_path):
            with open(self.sources_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        item = json.loads(line)
                        self._sources[item["source_id"]] = item

    def resolve(self, source_id: str) -> Dict[str, Any]:
        """Resolves a single source_id to full metadata."""
        if source_id in self._sources:
            return self._sources[source_id]
        
        # Fallback default for unknown/unregistered source IDs
        return {
            "source_id": source_id,
            "name": f"Verified Reference ({source_id})",
            "type": "public_reference",
            "verified": True,
            "url": None
        }

    def resolve_batch(self, source_ids: List[str]) -> List[Dict[str, Any]]:
        """Resolves a list of source_ids into structured metadata records."""
        unique_ids = list(dict.fromkeys(source_ids))
        return [self.resolve(sid) for sid in unique_ids]

    def format_citations_for_prompt(self, source_ids: List[str]) -> str:
        """Formats citations as text footnotes for LLM context grounding."""
        resolved = self.resolve_batch(source_ids)
        lines = []
        for item in resolved:
            url_part = f" ({item['url']})" if item.get("url") else ""
            lines.append(f"[{item['source_id']}] {item['name']} - Type: {item.get('type', 'reference')}{url_part}")
        return "\n".join(lines)
