import math
import httpx
import logging
from typing import Dict, Any, Optional
from app.services.telephony.base import TelephonyProvider
from app.core.config import settings

logger = logging.getLogger("exotel_provider")


class ExotelTelephonyProvider(TelephonyProvider):
    def __init__(self):
        self.api_key = settings.TELEPHONY_API_KEY
        self.api_token = settings.TELEPHONY_API_SECRET
        self.account_sid = settings.TELEPHONY_ACCOUNT_SID
        self.caller_id = settings.TELEPHONY_VIRTUAL_NUMBER
        self.base_url = f"https://api.exotel.com/v1/Accounts/{self.account_sid}"
        # Standard Indian commercial pulse rate (₹0.85 per 60-second pulse)
        self.rate_per_minute = 0.85

    async def initiate_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        callback_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Initiate an outbound voice call using Exotel Connect API.
        """
        caller_number = from_phone or self.caller_id
        url = f"{self.base_url}/Calls/connect.json"

        # Exotel expects: From, To, CallerId, Url / AppletId, StatusCallback
        payload = {
            "From": to_phone,  # Exotel Connect initiates by bridging customer to applet
            "To": caller_number,
            "CallerId": caller_number,
            "Url": callback_url or f"{settings.TELEPHONY_PUBLIC_URL}/api/webhooks/telephony",
            "StatusCallback": f"{settings.TELEPHONY_PUBLIC_URL}/api/webhooks/telephony",
            "StatusCallbackEvents[0]": "terminal",
            "CustomField": metadata.get("call_id") if metadata else None
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                auth=(self.api_key, self.api_token),
                data=payload
            )
            if resp.status_code in [200, 201]:
                res_data = resp.json()
                call_info = res_data.get("Call", {})
                return {
                    "success": True,
                    "provider_call_id": call_info.get("Sid"),
                    "status": call_info.get("Status", "initiated"),
                    "raw": res_data
                }
            else:
                logger.error(f"Exotel call initiation failed: {resp.status_code} - {resp.text}")
                return {
                    "success": False,
                    "provider_call_id": None,
                    "status": "failed",
                    "error": resp.text
                }

    async def terminate_call(self, provider_call_id: str) -> bool:
        """
        Hangup an active call via Exotel API.
        """
        url = f"{self.base_url}/Calls/{provider_call_id}.json"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                url,
                auth=(self.api_key, self.api_token),
                data={"Status": "completed"}
            )
            return resp.status_code == 200

    def calculate_cost(self, duration_seconds: int) -> float:
        """
        In India, cloud telecom is billed per 60-second pulse.
        """
        if duration_seconds <= 0:
            return 0.0
        pulses = math.ceil(duration_seconds / 60.0)
        return round(pulses * self.rate_per_minute, 2)
