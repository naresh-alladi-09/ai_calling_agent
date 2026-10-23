from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class CallStartRequest(BaseModel):
    lead_id: int
    campaign_id: Optional[int] = None
    language_override: Optional[str] = None  # 'te', 'en', or None to use lead preference
    mode: Optional[str] = None  # 'demo' or 'live'


class CallTestRequest(BaseModel):
    phone_number: str
    recipient_name: str = "Faculty In-Charge"
    college_name: str = "Engineering College"
    preferred_language: str = "te"


class CallSimulateTurnRequest(BaseModel):
    user_speech: str
    call_id: Optional[int] = None
    language_hint: Optional[str] = None


class CallSimulateTurnResponse(BaseModel):
    agent_response: str
    detected_language: str
    call_status: str
    outcome: Optional[str]
    detected_objections: List[str] = []
    opt_out_detected: bool = False
    demo_booking: Optional[Dict[str, Any]] = None
    ai_summary: Optional[str] = None
    audio_base64: Optional[str] = None


class CallOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    campaign_id: Optional[int] = None
    provider_call_id: Optional[str] = None
    provider: str
    direction: str
    status: str
    outcome: Optional[str] = None
    language_used: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: int
    cost_inr: float
    transcript: Optional[List[Dict[str, Any]]] = None
    ai_summary: Optional[str] = None
    detected_objections: Optional[List[str]] = None
    follow_up_action: Optional[str] = None
    recording_url: Optional[str] = None
    created_at: datetime
