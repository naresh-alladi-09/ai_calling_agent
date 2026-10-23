from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.campaign import CallCampaign, CampaignLead
from app.models.lead import CollegeLead
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/campaigns", tags=["Outbound Calling Campaigns"])


@router.get("", response_model=List[CampaignOut])
def get_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CallCampaign)
    if status:
        query = query.filter(CallCampaign.status == status)
    return query.order_by(desc(CallCampaign.created_at)).offset(skip).limit(limit).all()


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce safe concurrency limit
    max_concurrent = min(max(campaign_in.max_concurrent_calls, 1), 5)

    campaign = CallCampaign(
        name=campaign_in.name.strip(),
        script_prompt=campaign_in.script_prompt,
        preferred_language=campaign_in.preferred_language,
        max_concurrent_calls=max_concurrent,
        max_retries=campaign_in.max_retries,
        retry_interval_minutes=campaign_in.retry_interval_minutes,
        window_start_hour=campaign_in.window_start_hour,
        window_end_hour=campaign_in.window_end_hour,
        status="draft"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Attach leads
    lead_ids = campaign_in.lead_ids
    if not lead_ids:
        # Default: select all non-suppressed new leads
        leads = db.query(CollegeLead).filter(
            CollegeLead.is_suppressed == False,
            CollegeLead.status == "new"
        ).all()
        lead_ids = [l.id for l in leads]

    campaign_leads = []
    for lid in lead_ids:
        campaign_leads.append(CampaignLead(
            campaign_id=campaign.id,
            lead_id=lid,
            status="pending"
        ))

    if campaign_leads:
        db.add_all(campaign_leads)
        campaign.total_leads = len(campaign_leads)
        db.commit()
        db.refresh(campaign)

    return campaign


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: int,
    campaign_update: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(CallCampaign).filter(CallCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    data = campaign_update.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(campaign, field, val)

    campaign.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/emergency-stop")
def emergency_stop_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    GLOBAL EMERGENCY STOP: Immediately pauses all active campaigns and aborts outbound dialing.
    """
    running_campaigns = db.query(CallCampaign).filter(CallCampaign.status == "running").all()
    for camp in running_campaigns:
        camp.status = "stopped"
        camp.updated_at = datetime.now(timezone.utc)

    db.commit()
    return {
        "status": "stopped",
        "message": f"Global Emergency Stop executed. {len(running_campaigns)} campaigns halted immediately."
    }


@router.post("/{campaign_id}/start", response_model=CampaignOut)
def start_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(CallCampaign).filter(CallCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    campaign.status = "running"
    campaign.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/pause", response_model=CampaignOut)
def pause_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(CallCampaign).filter(CallCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    campaign.status = "paused"
    campaign.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(campaign)
    return campaign
