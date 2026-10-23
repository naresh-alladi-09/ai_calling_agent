from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SettingsUpdate(BaseModel):
    calling_mode: Optional[str] = None  # 'demo' or 'live'
    permitted_hours_start: Optional[int] = None
    permitted_hours_end: Optional[int] = None
    max_daily_budget: Optional[float] = None
    telephony_provider: Optional[str] = None
    voice_provider: Optional[str] = None
    default_llm_model: Optional[str] = None
    system_prompt: Optional[str] = None


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    calling_mode: str
    permitted_hours_start: int
    permitted_hours_end: int
    max_daily_budget: float
    current_day_expenditure: float
    telephony_provider: str
    voice_provider: str
    default_llm_model: str
    system_prompt: Optional[str] = None
    updated_at: datetime
