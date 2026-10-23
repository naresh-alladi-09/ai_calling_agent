from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("college_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type = Column(String(64), default="b2b_inquiry", nullable=False)  # 'explicit_opt_in', 'b2b_inquiry', 'verbal'
    channel = Column(String(32), default="voice", nullable=False)  # 'voice', 'web_form', 'email'
    proof_reference = Column(String(255), nullable=True)  # Form submission ID, audio confirmation timestamp
    granted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    withdrawn_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    lead = relationship("CollegeLead", back_populates="consent_records")


class SuppressionRecord(Base):
    __tablename__ = "suppression_records"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(32), unique=True, index=True, nullable=False)  # Normalized E.164
    reason = Column(String(128), default="opt_out_requested", nullable=False)  # 'opt_out_requested', 'ndnc_dnd', 'invalid_contact', 'legal_request'
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    source = Column(String(64), default="voice_call", nullable=False)  # 'voice_call', 'admin_manual', 'csv_import'
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    notes = Column(Text, nullable=True)
