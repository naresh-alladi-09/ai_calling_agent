import math
import uuid
from typing import Dict, Any, Optional
from app.services.telephony.base import TelephonyProvider


class SimulatedTelephonyProvider(TelephonyProvider):
    def __init__(self):
        self.active_calls: Dict[str, Dict[str, Any]] = {}
        self.rate_per_minute = 0.50

    async def initiate_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        callback_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        call_id = f"sim_{uuid.uuid4().hex[:12]}"
        self.active_calls[call_id] = {
            "to_phone": to_phone,
            "status": "in_progress",
            "metadata": metadata or {}
        }
        return {
            "success": True,
            "provider_call_id": call_id,
            "status": "in_progress"
        }

    async def terminate_call(self, provider_call_id: str) -> bool:
        if provider_call_id in self.active_calls:
            self.active_calls[provider_call_id]["status"] = "completed"
            return True
        return False

    def calculate_cost(self, duration_seconds: int) -> float:
        if duration_seconds <= 0:
            return 0.0
        pulses = math.ceil(duration_seconds / 60.0)
        return round(pulses * self.rate_per_minute, 2)
