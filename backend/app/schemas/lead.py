import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict


def normalize_indian_phone(value: str) -> str:
    """Normalize phone number to standard E.164 format (+91XXXXXXXXXX)."""
    clean = re.sub(r"[\s\-\(\)\.]", "", str(value).strip())
    if clean.startswith("+91"):
        digits = clean[3:]
    elif clean.startswith("0") and len(clean) == 11:
        digits = clean[1:]
    elif clean.startswith("91") and len(clean) == 12:
        digits = clean[2:]
    else:
        digits = clean

    if not re.match(r"^[6-9]\d{9}$", digits):
        raise ValueError(f"Invalid Indian phone number: '{value}'. Must be a valid 10-digit number.")
    return f"+91{digits}"


class CollegeLeadBase(BaseModel):
    college_name: str
    location: Optional[str] = None
    contact_name: str
    designation: Optional[str] = None
    phone_number: str
    email: Optional[EmailStr] = None
    preferred_language: str = "te"  # 'te', 'en', 'auto'
    contact_source: str = "manual"
    consent_status: str = "pending"
    consent_source: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_indian_phone(v)

    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        v_clean = v.lower().strip()
        if v_clean not in ["te", "en", "auto"]:
            return "auto"
        return v_clean


class CollegeLeadCreate(CollegeLeadBase):
    pass


class CollegeLeadUpdate(BaseModel):
    college_name: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    preferred_language: Optional[str] = None
    contact_source: Optional[str] = None
    consent_status: Optional[str] = None
    consent_source: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    next_followup_at: Optional[datetime] = None
    is_suppressed: Optional[bool] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return normalize_indian_phone(v)


class CollegeLeadOut(CollegeLeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_suppressed: bool
    status: str
    call_attempts: int
    last_called_at: Optional[datetime] = None
    next_followup_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class LeadImportResult(BaseModel):
    total_processed: int
    imported_count: int
    duplicate_count: int
    invalid_count: int
    suppressed_count: int
    errors: List[str] = []
