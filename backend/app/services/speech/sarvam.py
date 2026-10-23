import httpx
import base64
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("sarvam_speech")


class SarvamSpeechAdapter:
    """
    Adapter for Sarvam AI - India's leading multilingual foundational models.
    Provides natural Telugu and Indian English Speech-to-Text and Text-to-Speech.
    """
    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY
        self.tts_url = "https://api.sarvam.ai/text-to-speech"
        self.stt_url = "https://api.sarvam.ai/speech-to-text"
        self.voice_id = settings.SARVAM_VOICE_ID  # 'bulbul:v1'

    async def text_to_speech(self, text: str, language_code: str = "te-IN") -> Optional[str]:
        """
        Synthesize Telugu or Indian English speech into base64 audio.
        """
        if not self.api_key:
            return None

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": [text],
            "target_language_code": "te-IN" if language_code.startswith("te") else "en-IN",
            "speaker": "meera",  # or custom Indian male voice
            "pitch": 0,
            "pace": 1.05,
            "loudness": 1.5,
            "speech_sample_rate": 8000,
            "enable_preprocessing": True,
            "model": self.voice_id
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.tts_url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    audios = data.get("audios", [])
                    return audios[0] if audios else None
                else:
                    logger.warning(f"Sarvam TTS returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Error calling Sarvam TTS: {e}")
        return None

    async def speech_to_text(self, audio_bytes: bytes, language_code: str = "te-IN") -> Optional[str]:
        """
        Transcribe Telugu or English audio speech into text.
        """
        if not self.api_key:
            return None

        headers = {
            "api-subscription-key": self.api_key
        }
        files = {
            "file": ("audio.wav", audio_bytes, "audio/wav")
        }
        data = {
            "language_code": "te-IN" if language_code.startswith("te") else "en-IN",
            "model": settings.SARVAM_MODEL
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.stt_url, headers=headers, files=files, data=data)
                if res.status_code == 200:
                    return res.json().get("transcript")
        except Exception as e:
            logger.error(f"Error calling Sarvam STT: {e}")
        return None


sarvam_adapter = SarvamSpeechAdapter()
