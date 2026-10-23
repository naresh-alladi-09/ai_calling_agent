from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class CallCampaign(Base):
    __tablename__ = "call_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(32), default="draft", nullable=False, index=True)
    # 'draft', 'running', 'paused', 'completed', 'stopped'
    
    script_prompt = Column(Text, nullable=True)
    preferred_language = Column(String(16), default="auto", nullable=False)
    max_concurrent_calls = Column(Integer, default=2, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    retry_interval_minutes = Column(Integer, default=60, nullable=False)
    window_start_hour = Column(Integer, default=9, nullable=False)
    window_end_hour = Column(Integer, default=20, nullable=False)

    total_leads = Column(Integer, default=0, nullable=False)
    completed_leads = Column(Integer, default=0, nullable=False)
    successful_leads = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    calls = relationship("CallRecord", back_populates="campaign")
    campaign_leads = relationship("CampaignLead", back_populates="campaign", cascade="all, delete-orphan")


class CampaignLead(Base):
    __tablename__ = "campaign_leads"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("call_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("college_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="pending", nullable=False)  # 'pending', 'calling', 'completed', 'failed', 'skipped'
    attempts = Column(Integer, default=0, nullable=False)
    last_attempt_at = Column(DateTime, nullable=True)

    campaign = relationship("CallCampaign", back_populates="campaign_leads")
    lead = relationship("CollegeLead")

    __table_args__ = (
        Index("ix_campaign_lead_unique", "campaign_id", "lead_id", unique=True),
    )
