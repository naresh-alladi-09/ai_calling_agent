from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class DemoBookingCreate(BaseModel):
    lead_id: int
    call_id: Optional[int] = None
    contact_name: str
    contact_phone: str
    contact_email: Optional[EmailStr] = None
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # e.g. "11:30 AM IST"
    requirements_notes: Optional[str] = None


class DemoBookingUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    requirements_notes: Optional[str] = None
    status: Optional[str] = None
    contact_email: Optional[EmailStr] = None


class DemoBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    call_id: Optional[int] = None
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    scheduled_date: str
    scheduled_time: str
    requirements_notes: Optional[str] = None
    status: str
    created_at: datetime
