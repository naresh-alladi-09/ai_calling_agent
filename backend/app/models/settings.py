from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, Float
from app.core.database import Base


class ApplicationSettings(Base):
    __tablename__ = "application_settings"

    id = Column(Integer, primary_key=True, index=True)
    calling_mode = Column(String(32), default="demo", nullable=False)  # 'demo' or 'live'
    permitted_hours_start = Column(Integer, default=9, nullable=False)  # 9 AM IST
    permitted_hours_end = Column(Integer, default=20, nullable=False)    # 8 PM IST
    max_daily_budget = Column(Float, default=1000.0, nullable=False)
    current_day_expenditure = Column(Float, default=0.0, nullable=False)
    telephony_provider = Column(String(32), default="simulated", nullable=False)
    voice_provider = Column(String(32), default="sarvam", nullable=False)
    default_llm_model = Column(String(64), default="gpt-4o-mini", nullable=False)
    system_prompt = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class ProviderEvent(Base):
    __tablename__ = "provider_events"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(32), nullable=False, index=True)
    event_id = Column(String(128), unique=True, index=True, nullable=False)
    event_type = Column(String(64), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    signature = Column(String(255), nullable=True)
    processed = Column(Boolean, default=False, nullable=False)
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
