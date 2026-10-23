from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class TelephonyProvider(ABC):
    @abstractmethod
    async def initiate_call(
        self,
        to_phone: str,
        from_phone: str,
        callback_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Initiate an outbound phone call via carrier network.
        Returns provider call ID and initial status.
        """
        pass

    @abstractmethod
    async def terminate_call(self, provider_call_id: str) -> bool:
        """
        Hang up or cancel an in-progress call.
        """
        pass

    @abstractmethod
    def calculate_cost(self, duration_seconds: int) -> float:
        """
        Calculate total cost in Indian Rupees (INR) based on provider pulse billing.
        """
        pass
