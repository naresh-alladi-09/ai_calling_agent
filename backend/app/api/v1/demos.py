from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.demo import DemoBooking
from app.models.lead import CollegeLead
from app.models.user import User
from app.schemas.demo import DemoBookingCreate, DemoBookingUpdate, DemoBookingOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/demos", tags=["Demo Bookings"])


@router.get("", response_model=List[DemoBookingOut])
def get_demos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DemoBooking)
    if status:
        query = query.filter(DemoBooking.status == status)
    return query.order_by(desc(DemoBooking.created_at)).offset(skip).limit(limit).all()


@router.post("", response_model=DemoBookingOut, status_code=status.HTTP_201_CREATED)
def create_demo(
    demo_in: DemoBookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(CollegeLead).filter(CollegeLead.id == demo_in.lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    demo = DemoBooking(
        lead_id=demo_in.lead_id,
        call_id=demo_in.call_id,
        contact_name=demo_in.contact_name.strip(),
        contact_phone=demo_in.contact_phone.strip(),
        contact_email=demo_in.contact_email,
        scheduled_date=demo_in.scheduled_date,
        scheduled_time=demo_in.scheduled_time,
        requirements_notes=demo_in.requirements_notes,
        status="scheduled"
    )
    db.add(demo)
    lead.status = "demo_requested"
    db.commit()
    db.refresh(demo)
    return demo


@router.patch("/{demo_id}", response_model=DemoBookingOut)
def update_demo(
    demo_id: int,
    demo_update: DemoBookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    demo = db.query(DemoBooking).filter(DemoBooking.id == demo_id).first()
    if not demo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo booking not found")

    data = demo_update.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(demo, field, val)

    db.commit()
    db.refresh(demo)
    return demo
