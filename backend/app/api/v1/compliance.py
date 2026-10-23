from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.compliance import SuppressionRecord, ConsentRecord
from app.models.lead import CollegeLead
from app.models.settings import ApplicationSettings
from app.models.user import User
from app.schemas.compliance import OptOutRequest, SuppressionRecordOut, ComplianceCheckResult
from app.schemas.lead import normalize_indian_phone
from app.api.deps import get_current_user

router = APIRouter(prefix="", tags=["Compliance & Do-Not-Call (DND)"])


@router.post("/contacts/{lead_id}/opt-out")
def opt_out_contact(
    lead_id: int,
    req: OptOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Opt out a college lead contact. Immediately prevents future outbound calling.
    """
    lead = db.query(CollegeLead).filter(CollegeLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    now = datetime.now(timezone.utc)
    lead.is_suppressed = True
    lead.status = "opted_out"

    # Add or update suppression record
    suppression = db.query(SuppressionRecord).filter(
        SuppressionRecord.phone_number == lead.phone_number
    ).first()

    if not suppression:
        suppression = SuppressionRecord(
            phone_number=lead.phone_number,
            reason=req.reason or "Explicit opt-out request",
            requested_at=now,
            source="user_interface",
            is_active=True,
            notes=req.notes
        )
        db.add(suppression)
    else:
        suppression.is_active = True
        suppression.requested_at = now

    # Mark active consents as withdrawn
    for consent in lead.consent_records:
        if consent.is_active:
            consent.is_active = False
            consent.withdrawn_at = now

    db.commit()
    return {
        "success": True,
        "lead_id": lead.id,
        "phone_number": lead.phone_number,
        "status": "opted_out",
        "message": "Contact successfully added to suppression list. Outbound calling blocked."
    }


@router.get("/compliance/suppression-list", response_model=List[SuppressionRecordOut])
def get_suppression_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve Do-Not-Call suppression records.
    """
    return db.query(SuppressionRecord).filter(
        SuppressionRecord.is_active == True
    ).order_by(desc(SuppressionRecord.requested_at)).offset(skip).limit(limit).all()


@router.post("/compliance/suppress", response_model=SuppressionRecordOut)
def add_suppression_record(
    req: OptOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually add a phone number to the Do-Not-Call suppression list.
    """
    if not req.phone_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required")

    try:
        norm_phone = normalize_indian_phone(req.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    now = datetime.now(timezone.utc)
    suppression = db.query(SuppressionRecord).filter(
        SuppressionRecord.phone_number == norm_phone
    ).first()

    if suppression:
        suppression.is_active = True
        suppression.requested_at = now
        suppression.notes = req.notes
    else:
        suppression = SuppressionRecord(
            phone_number=norm_phone,
            reason=req.reason or "Manual suppression",
            requested_at=now,
            source="admin_manual",
            is_active=True,
            notes=req.notes
        )
        db.add(suppression)

    # If lead exists in DB, update lead status
    lead = db.query(CollegeLead).filter(CollegeLead.phone_number == norm_phone).first()
    if lead:
        lead.is_suppressed = True
        lead.status = "opted_out"

    db.commit()
    db.refresh(suppression)
    return suppression


@router.get("/compliance/check", response_model=ComplianceCheckResult)
def check_calling_compliance(
    phone_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verify whether outbound calling to a phone number is permissible right now under TRAI guidelines.
    """
    try:
        norm_phone = normalize_indian_phone(phone_number)
    except ValueError as e:
        return ComplianceCheckResult(
            is_allowed=False,
            is_suppressed=False,
            is_within_hours=False,
            reason=f"Invalid phone format: {str(e)}",
            current_hour_ist=0,
            window_start=9,
            window_end=20
        )

    # 1. Check suppression
    is_suppressed = db.query(SuppressionRecord).filter(
        SuppressionRecord.phone_number == norm_phone,
        SuppressionRecord.is_active == True
    ).first() is not None

    # 2. Check TRAI Calling Window (09:00 - 20:00 IST)
    settings = db.query(ApplicationSettings).first()
    window_start = settings.permitted_hours_start if settings else 9
    window_end = settings.permitted_hours_end if settings else 20

    now_utc = datetime.now(timezone.utc)
    ist_time = now_utc + timedelta(hours=5, minutes=30)
    current_hour_ist = ist_time.hour
    is_within_hours = (window_start <= current_hour_ist < window_end)

    is_allowed = (not is_suppressed) and is_within_hours
    reason = None
    if is_suppressed:
        reason = "Number is on the Do-Not-Call (DND) suppression list"
    elif not is_within_hours:
        reason = f"Current IST time ({ist_time.strftime('%H:%M')}) is outside TRAI commercial calling hours ({window_start}:00 to {window_end}:00 IST)"

    return ComplianceCheckResult(
        is_allowed=is_allowed,
        is_suppressed=is_suppressed,
        is_within_hours=is_within_hours,
        reason=reason,
        current_hour_ist=current_hour_ist,
        window_start=window_start,
        window_end=window_end
    )
