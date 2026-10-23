import math
import httpx
import logging
from typing import Dict, Any, Optional
from app.services.telephony.base import TelephonyProvider
from app.core.config import settings

logger = logging.getLogger("twilio_provider")


class TwilioTelephonyProvider(TelephonyProvider):
    """
    Twilio Telephony Provider for initiating real outbound phone calls.
    Supports Twilio Free Trial accounts and live production accounts.
    """
    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        virtual_number: Optional[str] = None
    ):
        self.account_sid = account_sid or settings.TELEPHONY_ACCOUNT_SID
        self.auth_token = auth_token or settings.TELEPHONY_API_SECRET
        self.caller_id = virtual_number or settings.TELEPHONY_VIRTUAL_NUMBER
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"
        # Standard voice rate (~$0.02 / min or ₹1.70 per minute)
        self.rate_per_minute = 1.70

    async def initiate_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        callback_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        custom_twiml: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate a genuine outbound voice call to a real mobile number via Twilio REST API.
        """
        caller_number = from_phone or self.caller_id
        url = f"{self.base_url}/Calls.json"

        # If custom TwiML not passed, generate bilingual Student Management System pitch
        if not custom_twiml:
            lang = metadata.get("preferred_language", "en") if metadata else "en"
            college = metadata.get("college_name", "your institution") if metadata else "your institution"
            contact = metadata.get("contact_name", "Sir or Madam") if metadata else "Sir or Madam"

            if lang == "te":
                say_text = (
                    f"Namaskaram {contact} garu! This is Nani from the Student Management System project calling for {college}. "
                    "We provide dynamic thirty-second QR attendance to eliminate student proxy check-ins "
                    "and automated UGC shortage calculation. We would love to schedule a live demonstration for your department."
                )
                voice_code = "Polly.Aditi"
                lang_code = "en-IN"
            else:
                say_text = (
                    f"Hello {contact}! This is Nani from the Student Management System project calling for {college}. "
                    "We provide dynamic thirty-second QR attendance to eliminate student proxy check-ins "
                    "and automated UGC shortage calculation. We would love to schedule a live demonstration for your department. Thank you!"
                )
                voice_code = "Polly.Aditi"
                lang_code = "en-IN"

            custom_twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice_code}" language="{lang_code}">{say_text}</Say>
    <Pause length="2"/>
    <Say voice="{voice_code}" language="{lang_code}">Please reply or visit our website to confirm your demo time. Have a wonderful day!</Say>
</Response>"""

        payload = {
            "To": to_phone,
            "From": caller_number,
            "Twiml": custom_twiml,
        }

        if callback_url:
            payload["StatusCallback"] = callback_url
            payload["StatusCallbackEvent"] = ["initiated", "ringing", "answered", "completed"]

        if not self.account_sid or not self.auth_token or self.account_sid == "mock_sid":
            logger.warning("Twilio credentials not configured in settings or environment. Call will not reach carrier.")
            return {
                "success": False,
                "provider_call_id": None,
                "status": "config_missing",
                "error": "Twilio Account SID or Auth Token missing. Please configure credentials in Settings."
            }

        async with httpx.AsyncClient(timeout=12.0) as client:
            try:
                resp = await client.post(
                    url,
                    auth=(self.account_sid, self.auth_token),
                    data=payload
                )
                if resp.status_code in [200, 201]:
                    res_data = resp.json()
                    return {
                        "success": True,
                        "provider_call_id": res_data.get("sid"),
                        "status": res_data.get("status", "queued"),
                        "raw": res_data
                    }
                else:
                    err_msg = resp.text
                    try:
                        err_json = resp.json()
                        err_msg = err_json.get("message", resp.text)
                    except Exception:
                        pass
                    logger.error(f"Twilio call initiation failed: {resp.status_code} - {err_msg}")
                    return {
                        "success": False,
                        "provider_call_id": None,
                        "status": "failed",
                        "error": f"Twilio API Error ({resp.status_code}): {err_msg}"
                    }
            except Exception as ex:
                logger.error(f"Twilio network request error: {ex}")
                return {
                    "success": False,
                    "provider_call_id": None,
                    "status": "failed",
                    "error": str(ex)
                }

    async def terminate_call(self, provider_call_id: str) -> bool:
        """
        Terminate/hang up an in-progress Twilio call.
        """
        url = f"{self.base_url}/Calls/{provider_call_id}.json"
        async with httpx.AsyncClient(timeout=6.0) as client:
            try:
                resp = await client.post(
                    url,
                    auth=(self.account_sid, self.auth_token),
                    data={"Status": "completed"}
                )
                return resp.status_code == 200
            except Exception:
                return False

    def calculate_cost(self, duration_seconds: int) -> float:
        if duration_seconds <= 0:
            return 0.0
        pulses = math.ceil(duration_seconds / 60.0)
        return round(pulses * self.rate_per_minute, 2)
