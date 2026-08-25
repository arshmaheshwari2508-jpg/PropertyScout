"""
Smallest AI TTS Connector Client for Voice-First AI Property Scout.
Uses Smallest AI Waves / Lightning API for ultra-low latency (<100ms) natural speech synthesis.
"""

import os
import requests
from typing import Dict, Any, Optional


class SmallestAITTSClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_id: str = "emily",
        model: str = "lightning"
    ):
        self.api_key = api_key or os.getenv("SMALLEST_API_KEY", "")
        self.voice_id = os.getenv("SMALLEST_VOICE_ID", voice_id)
        self.model = os.getenv("SMALLEST_TTS_MODEL", model)
        self.base_url = "https://api.smallest.ai/v1/lightning/get_speech"

    def synthesize_speech(self, text: str) -> Dict[str, Any]:
        """
        Synthesizes text into natural speech audio stream using Smallest AI.
        """
        if not self.api_key or self.api_key == "your_smallest_ai_api_key_here":
            # Return Web Speech API fallback configuration
            return {
                "engine": "web_speech_fallback",
                "text": text,
                "voice_id": self.voice_id,
                "audio_url": None,
                "status": "fallback_mode"
            }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "text": text,
            "voice_id": self.voice_id,
            "sample_rate": 24000,
            "speed": 1.0
        }

        try:
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=5)
            if response.status_code == 200:
                return {
                    "engine": "smallest_ai",
                    "text": text,
                    "audio_bytes": response.content,
                    "status": "success"
                }
        except Exception as e:
            pass

        return {
            "engine": "web_speech_fallback",
            "text": text,
            "voice_id": self.voice_id,
            "audio_url": None,
            "status": "fallback_mode"
        }
