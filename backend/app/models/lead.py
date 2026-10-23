from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class CollegeLead(Base):
    __tablename__ = "college_leads"

    id = Column(Integer, primary_key=True, index=True)
    college_name = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=True)  # City / State (e.g. Hyderabad, Telangana)
    contact_name = Column(String(255), nullable=False)
    designation = Column(String(255), nullable=True)  # Principal, Dean, HOD, Admin Officer
    phone_number = Column(String(32), unique=True, index=True, nullable=False)  # Normalized E.164 (+91...)
    email = Column(String(255), nullable=True, index=True)
    preferred_language = Column(String(16), default="te", nullable=False)  # 'te' (Telugu), 'en' (English), 'auto'
    contact_source = Column(String(64), default="manual", nullable=False)  # 'manual', 'csv_import', 'directory'
    
    # Compliance & Consent
    consent_status = Column(String(32), default="pending", nullable=False)  # 'explicit_consent', 'legitimate_interest', 'pending', 'opted_out'
    consent_timestamp = Column(DateTime, nullable=True)
    consent_source = Column(String(255), nullable=True)
    is_suppressed = Column(Boolean, default=False, nullable=False, index=True)

    # Calling lifecycle
    status = Column(String(64), default="new", nullable=False, index=True)
    # Possible statuses:
    # 'new', 'queued', 'in_progress', 'interested', 'demo_requested',
    # 'callback_requested', 'info_requested', 'decision_maker_unavailable',
    # 'not_interested', 'no_answer', 'busy', 'invalid_number', 'opted_out'
    call_attempts = Column(Integer, default=0, nullable=False)
    last_called_at = Column(DateTime, nullable=True)
    next_followup_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    calls = relationship("CallRecord", back_populates="lead", cascade="all, delete-orphan")
    consent_records = relationship("ConsentRecord", back_populates="lead", cascade="all, delete-orphan")
    demo_bookings = relationship("DemoBooking", back_populates="lead", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_lead_status_suppressed", "status", "is_suppressed"),
    )
