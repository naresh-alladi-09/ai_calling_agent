from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OptOutRequest(BaseModel):
    phone_number: Optional[str] = None
    reason: str = "opt_out_requested"
    notes: Optional[str] = None


class SuppressionRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: str
    reason: str
    requested_at: datetime
    source: str
    is_active: bool
    notes: Optional[str] = None


class ComplianceCheckResult(BaseModel):
    is_allowed: bool
    is_suppressed: bool
    is_within_hours: bool
    reason: Optional[str] = None
    current_hour_ist: int
    window_start: int
    window_end: int
