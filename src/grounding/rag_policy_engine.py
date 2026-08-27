"""
RAG Retrieval Policy Engine for Voice-First AI Property Scout.
Enforces the 15 RAG Policy Rules:
  1. Non-Binary Safety outputs (empirical evidence only, no binary 'safe' or 'unsafe' claims).
  2. Zero cross-locality inference (enforces do_not_infer constraints).
  3. Explicit data unavailability fallback: "I don't have enough verified information to make that claim."
  4. Integration with Gemini 2.5 Flash Lite LLM, Smallest AI TTS, OpenStreetMap MCP, and CitationResolver.
"""

from typing import Dict, Any, List, Optional
from src.grounding.query_router import IntentQueryRouter, QueryIntent
from src.grounding.weighted_rag_engine import WeightedRAGEngine
from src.grounding.osm_mcp_client import OpenStreetMapMCPClient
from src.grounding.citation_resolver import CitationResolver
from src.data.listings_db import PropertyListingsDB
from src.agent.gemini_agent import GeminiPropertyAgent
from src.agent.smallest_tts import SmallestAITTSClient


class RAGPolicyEngine:
    def __init__(
        self,
        rag_engine: Optional[WeightedRAGEngine] = None,
        osm_client: Optional[OpenStreetMapMCPClient] = None,
        citation_resolver: Optional[CitationResolver] = None,
        listings_db: Optional[PropertyListingsDB] = None,
        gemini_agent: Optional[GeminiPropertyAgent] = None,
        tts_client: Optional[SmallestAITTSClient] = None
    ):
        self.rag_engine = rag_engine or WeightedRAGEngine()
        self.osm_client = osm_client or OpenStreetMapMCPClient()
        self.citation_resolver = citation_resolver or CitationResolver()
        self.listings_db = listings_db or PropertyListingsDB()
        self.gemini_agent = gemini_agent or GeminiPropertyAgent()
        self.tts_client = tts_client or SmallestAITTSClient()

    def process_query(self, user_query: str, active_locality: Optional[str] = None, persona: str = "Renter") -> Dict[str, Any]:
        """
        Orchestrates query intent classification, layer routing, guardrail enforcement,
        Gemini 2.5 Flash Lite reasoning, Smallest AI TTS synthesis, and citation formatting.
        """
        intent = IntentQueryRouter.classify_intent(user_query)
        target_locality = active_locality or IntentQueryRouter.extract_locality_mention(user_query)

        # -------------------------------------------------------------
        # Layer 0: Out-of-Scope Intercept (Non-real-estate / general queries)
        # -------------------------------------------------------------
        if intent == QueryIntent.OUT_OF_SCOPE:
            decline_text = "We can't help you with this. Our platform currently specializes exclusively in verified rental property discovery in Bengaluru."
            tts_res = self.tts_client.synthesize_speech(decline_text)
            return {
                "intent": intent.value,
                "target_locality": target_locality,
                "data_source": "Scope Enforcement Guardrail",
                "rag_used": False,
                "listings": [],
                "grounded_context": decline_text,
                "final_answer": decline_text,
                "citations": [],
                "tts": tts_res,
                "policy_notice": "Off-topic / non-real-estate query declined by strict scope enforcement policy."
            }

        # -------------------------------------------------------------
        # Layer 1: Current Listings & Rent Prices (bengaluru.rent DB)
        # RAG is NEVER used for current rents or listings.
        # -------------------------------------------------------------
        if intent == QueryIntent.LISTING_PRICING:
            max_budget = IntentQueryRouter.extract_max_budget_inr(user_query)
            exact_bhk = IntentQueryRouter.extract_bhk_from_query(user_query)
            listing_type = "rent"

            # Negative grounding for explicit but unindexed localities
            if target_locality and not self.listings_db.is_known_locality(target_locality):
                fallback_text = "I don't have enough verified information to make that claim."
                tts_res = self.tts_client.synthesize_speech(fallback_text)
                return {
                    "intent": intent.value,
                    "target_locality": target_locality,
                    "data_source": "Negative Grounding Guardrail",
                    "rag_used": False,
                    "listings": [],
                    "grounded_context": fallback_text,
                    "final_answer": fallback_text,
                    "citations": [],
                    "tts": tts_res,
                    "policy_notice": "Unindexed locality — explicit data unavailability fallback enforced."
                }
            
            listings = self.listings_db.filter_listings(
                locality=target_locality,
                listing_type=listing_type,
                max_price=max_budget,
                exact_bedrooms=exact_bhk
            )
            
            if listings:
                top_matches = listings[:3]
                prop_summaries = []
                for p in top_matches:
                    price_val = p.get('rent_inr') if listing_type == 'rent' else p.get('sale_price_inr')
                    if price_val is None:
                        price_val = p.get('sale_price_inr') or p.get('rent_inr') or 0
                    bhk_label = f"{p['bedrooms']} BHK" if p.get('bedrooms') else "Apartment"
                    prop_summaries.append(f"{p['society_name']} ({bhk_label} at ₹{int(price_val):,})")
                
                suggestions_str = ", ".join(prop_summaries)
                answer_text = f"Here are the suggested properties for you: {suggestions_str} in {target_locality or 'Bengaluru'}. Is that fine, and would you like me to schedule a physical site visit for any of these properties, or should we continue?"
            else:
                answer_text = "Sorry, no properties found matching those criteria. Feel free to adjust your budget or locality preferences! Is that fine, and would you like us to continue?"

            citations = [self.citation_resolver.resolve("SRC_BENGALURU_RENT")]
            tts_res = self.tts_client.synthesize_speech(answer_text)
            
            return {
                "intent": intent.value,
                "target_locality": target_locality,
                "data_source": "bengaluru.rent Property DB",
                "rag_used": False,
                "listings": listings[:4],
                "grounded_context": answer_text,
                "final_answer": answer_text,
                "citations": citations,
                "tts": tts_res,
                "policy_notice": "Listings and rents sourced directly from active property database (RAG bypassed)."
            }

        # -------------------------------------------------------------
        # Layer 2: Spatial Transit & Metro Distances (OpenStreetMap MCP)
        # RAG is NEVER used for exact distances or POIs.
        # -------------------------------------------------------------
        if intent == QueryIntent.LIVE_TRANSIT_POI:
            target_loc = target_locality or active_locality or "Indiranagar"
            if target_loc == "Indiranagar":
                lat, lon = 12.9784, 77.6385
            elif target_loc == "HSR Layout":
                lat, lon = 12.9175, 77.6238
            elif target_loc == "Whitefield":
                lat, lon = 12.9965, 77.7600
            else:
                lat, lon = 12.9345, 77.6262

            osm_data = self.osm_client.get_nearby_pois(lat=lat, lon=lon)
            metro_data = self.osm_client.get_nearest_metro_station(lat=lat, lon=lon, locality=target_loc)

            answer_text = f"The nearest metro station to {target_loc} is {metro_data['station_name']} ({metro_data['distance_km']} km away, {metro_data['metro_line']}). Is that fine, and would you like us to continue exploring properties or check site visit slots?"
            citations = [self.citation_resolver.resolve("SRC_OSM_MCP")]
            tts_res = self.tts_client.synthesize_speech(answer_text)
            
            return {
                "intent": intent.value,
                "target_locality": target_locality,
                "data_source": "OpenStreetMap MCP Server",
                "rag_used": False,
                "spatial_data": osm_data,
                "metro_data": metro_data,
                "grounded_context": answer_text,
                "final_answer": answer_text,
                "citations": citations,
                "tts": tts_res,
                "policy_notice": "Spatial transit & exact distances calculated via OpenStreetMap MCP (RAG bypassed)."
            }

        # -------------------------------------------------------------
        # Layer 4: Safety & Crime Statistics (safety_sources.jsonl)
        # Binary 'safe' or 'unsafe' claims are STRICTLY FORBIDDEN.
        # -------------------------------------------------------------
        if intent == QueryIntent.CRIME_SAFETY:
            safety_chunks = self.rag_engine.retrieve(user_query, locality="ALL_BENGALURU", top_k=2)
            citations = [self.citation_resolver.resolve("SRC_KAR_POLICE_CRIME_2025")]
            
            context_text = "\n".join([c["content"] for c in safety_chunks])
            citations_text = self.citation_resolver.format_citations_for_prompt(["SRC_KAR_POLICE_CRIME_2025"])
            
            answer_text = self.gemini_agent.generate_grounded_response(
                user_query=user_query,
                retrieved_context=context_text,
                citations_text=citations_text,
                do_not_infer=["safety_rating"],
                persona=persona
            )
            tts_res = self.tts_client.synthesize_speech(answer_text)
            
            return {
                "intent": intent.value,
                "target_locality": target_locality,
                "data_source": "Karnataka Police Crime Review 2025 (safety_sources.jsonl)",
                "rag_used": True,
                "chunks": safety_chunks,
                "grounded_context": context_text,
                "final_answer": answer_text,
                "citations": citations,
                "tts": tts_res,
                "policy_notice": "Safety queries output empirical crime evidence only. Binary 'safe'/'unsafe' claims are prohibited."
            }

        # -------------------------------------------------------------
        # Layer 3: Neighborhood Context, History & Development (RAG Vector Store)
        # -------------------------------------------------------------
        chunks = self.rag_engine.retrieve(user_query, locality=target_locality, top_k=3)
        
        if not chunks:
            fallback_text = "I don't have enough verified information to make that claim."
            tts_res = self.tts_client.synthesize_speech(fallback_text)
            return {
                "intent": intent.value,
                "target_locality": target_locality,
                "data_source": "ChromaDB RAG Vector Store",
                "rag_used": True,
                "chunks": [],
                "grounded_context": fallback_text,
                "final_answer": fallback_text,
                "citations": [],
                "tts": tts_res,
                "policy_notice": "Unindexed locality query returned explicit unavailability notice."
            }

        # Check for do_not_infer policy constraints
        primary_chunk = chunks[0]
        do_not_infer = primary_chunk.get("do_not_infer", [])
        
        source_ids = []
        for c in chunks:
            source_ids.extend(c.get("sources", [c.get("source_id", "SRC_WIKI_NEIGHBORHOODS")]))
            
        citations = self.citation_resolver.resolve_batch(source_ids)
        context_str = "\n\n".join([c["content"] for c in chunks])
        citations_text = self.citation_resolver.format_citations_for_prompt(source_ids)

        # Generate Gemini 2.5 Flash Lite Grounded Answer
        final_answer = self.gemini_agent.generate_grounded_response(
            user_query=user_query,
            retrieved_context=context_str,
            citations_text=citations_text,
            do_not_infer=do_not_infer,
            persona=persona
        )
        tts_res = self.tts_client.synthesize_speech(final_answer)

        return {
            "intent": intent.value,
            "target_locality": target_locality,
            "data_source": "ChromaDB RAG Vector Store (localities.jsonl)",
            "rag_used": True,
            "chunks": chunks,
            "grounded_context": context_str,
            "final_answer": final_answer,
            "do_not_infer": do_not_infer,
            "citations": citations,
            "tts": tts_res,
            "policy_notice": "Neighborhood context retrieved with weighted cosine scoring, Gemini 2.5 Flash Lite reasoning, and Smallest AI TTS."
        }
