from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class DemoBooking(Base):
    __tablename__ = "demo_bookings"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("college_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    call_id = Column(Integer, ForeignKey("call_records.id", ondelete="SET NULL"), nullable=True, index=True)
    contact_name = Column(String(255), nullable=False)
    contact_phone = Column(String(32), nullable=False)
    contact_email = Column(String(255), nullable=True)
    scheduled_date = Column(String(32), nullable=False)  # YYYY-MM-DD
    scheduled_time = Column(String(32), nullable=False)  # HH:MM (e.g. 11:30 AM IST)
    requirements_notes = Column(Text, nullable=True)
    status = Column(String(32), default="scheduled", nullable=False)  # 'scheduled', 'completed', 'cancelled', 'rescheduled'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    lead = relationship("CollegeLead", back_populates="demo_bookings")
    call = relationship("CallRecord", back_populates="demo_booking")
