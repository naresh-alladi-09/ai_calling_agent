from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CampaignCreate(BaseModel):
    name: str
    script_prompt: Optional[str] = None
    preferred_language: str = "auto"
    max_concurrent_calls: int = 2
    max_retries: int = 3
    retry_interval_minutes: int = 60
    window_start_hour: int = 9
    window_end_hour: int = 20
    lead_ids: Optional[List[int]] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    script_prompt: Optional[str] = None
    preferred_language: Optional[str] = None
    max_concurrent_calls: Optional[int] = None
    max_retries: Optional[int] = None
    retry_interval_minutes: Optional[int] = None
    window_start_hour: Optional[int] = None
    window_end_hour: Optional[int] = None
    status: Optional[str] = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    status: str
    script_prompt: Optional[str] = None
    preferred_language: str
    max_concurrent_calls: int
    max_retries: int
    retry_interval_minutes: int
    window_start_hour: int
    window_end_hour: int
    total_leads: int
    completed_leads: int
    successful_leads: int
    created_at: datetime
    updated_at: datetime
