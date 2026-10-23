from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class CallRecord(Base):
    __tablename__ = "call_records"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("college_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    campaign_id = Column(Integer, ForeignKey("call_campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    provider_call_id = Column(String(128), unique=True, index=True, nullable=True)
    provider = Column(String(32), default="simulated", nullable=False)  # 'simulated', 'exotel', 'twilio'
    direction = Column(String(16), default="outbound", nullable=False)
    
    # State & Outcome
    status = Column(String(32), default="initiated", nullable=False, index=True)
    # 'initiated', 'ringing', 'in_progress', 'completed', 'busy', 'no_answer', 'failed', 'canceled'
    outcome = Column(String(64), nullable=True, index=True)
    # 'interested', 'demo_requested', 'callback_requested', 'info_requested',
    # 'decision_maker_unavailable', 'not_interested', 'no_answer', 'busy', 'invalid_number', 'opted_out'
    
    language_used = Column(String(16), default="bilingual", nullable=False)  # 'te', 'en', 'bilingual'
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)
    cost_inr = Column(Float, default=0.0, nullable=False)

    # Intelligence & Analytics
    transcript = Column(JSON, nullable=True)  # List of {role: 'agent'|'lead', text: '...', timestamp: '...'}
    ai_summary = Column(Text, nullable=True)
    detected_objections = Column(JSON, nullable=True)  # List of strings e.g. ["Already have software", "Price objection"]
    follow_up_action = Column(String(255), nullable=True)
    recording_url = Column(String(512), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    lead = relationship("CollegeLead", back_populates="calls")
    campaign = relationship("CallCampaign", back_populates="calls")
    demo_booking = relationship("DemoBooking", back_populates="call", uselist=False)
