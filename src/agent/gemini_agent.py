"""
Gemini AI Agent Interface for Voice-First AI Property Scout.
Primary LLM: gemini-2.5-flash (Ultra-fast turn-taking & grounded reasoning)
Primary STT: gemini-2.5-flash (Native multimodal audio processing)
"""

import os
from typing import Dict, Any, List, Optional
import google.generativeai as genai


class GeminiPropertyAgent:
    def __init__(
        self,
        api_key: Optional[str] = None,
        llm_model: str = "gemini-2.5-flash",
        stt_model: str = "gemini-2.5-flash"
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.llm_model_name = os.getenv("GEMINI_LLM_MODEL", llm_model)
        self.stt_model_name = stt_model
        
        if self.api_key and self.api_key != "your_gemini_api_key_here":
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(model_name=self.llm_model_name)
            self.is_configured = True
        else:
            self.model = None
            self.is_configured = False

    def generate_grounded_response(
        self,
        user_query: str,
        retrieved_context: str,
        citations_text: str,
        do_not_infer: List[str],
        persona: str = "Renter"
    ) -> str:
        """
        Generates a grounded response using Gemini 2.5 Flash.
        Enforces negative grounding (do_not_infer) and non-binary safety.
        """
        if not self.is_configured:
            # Fallback mock response for offline/unconfigured API key mode
            return f"[Gemini Agent Mode ({persona})]: Based on verified records, {retrieved_context[:200]}..."

        do_not_infer_str = ", ".join(do_not_infer) if do_not_infer else "None"

        system_prompt = f"""
You are the Voice-First AI Property Scout for Bengaluru Real Estate operating in **{persona} Mode**.
Answer the user's query using ONLY the provided verified context.

STRICT POLICY RULES:
1. Do NOT make claims forbidden by DO_NOT_INFER array: [{do_not_infer_str}]
2. Never output binary 'safe' or 'unsafe' ratings for safety/crime queries. Output empirical evidence only.
3. If verified context is missing or insufficient, state explicitly: "I don't have enough verified information to make that claim."
4. Maintain a professional, concise, voice-friendly tone (< 3 sentences).

VERIFIED CONTEXT:
{retrieved_context}

CITATIONS:
{citations_text}

USER QUERY: {user_query}
"""

        try:
            response = self.model.generate_content(system_prompt)
            return response.text.strip()
        except Exception as e:
            return f"I don't have enough verified information to make that claim. (Error: {str(e)})"
