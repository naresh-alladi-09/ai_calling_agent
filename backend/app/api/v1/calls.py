from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.config import settings
from app.models.call import CallRecord
from app.models.lead import CollegeLead
from app.models.compliance import SuppressionRecord
from app.models.settings import ApplicationSettings
from app.models.user import User
from app.schemas.call import CallOut, CallStartRequest, CallTestRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/calls", tags=["Voice Calling & History"])


@router.get("", response_model=List[CallOut])
def get_calls(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    lead_id: Optional[int] = None,
    outcome: Optional[str] = None,
    status: Optional[str] = None,
    language: Optional[str] = None,
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve call history with filters, sorting, and pagination.
    """
    query = db.query(CallRecord)
    if lead_id:
        query = query.filter(CallRecord.lead_id == lead_id)
    if outcome:
        query = query.filter(CallRecord.outcome == outcome)
    if status:
        query = query.filter(CallRecord.status == status)
    if language:
        query = query.filter(CallRecord.language_used == language)

    if sort_order == "desc":
        query = query.order_by(desc(CallRecord.created_at))
    else:
        query = query.order_by(CallRecord.created_at)

    return query.offset(skip).limit(limit).all()


@router.get("/{call_id}", response_model=CallOut)
def get_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve full call record including conversation transcript, objections, and AI summary.
    """
    call = db.query(CallRecord).filter(CallRecord.id == call_id).first()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call record not found")
    return call


@router.post("/start", response_model=CallOut, status_code=status.HTTP_201_CREATED)
def start_call(
    call_request: CallStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initiate an outbound sales call to an eligible college lead.
    Enforces suppression check and TRAI calling hours.
    """
    lead = db.query(CollegeLead).filter(CollegeLead.id == call_request.lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="College lead not found")

    # 1. Check suppression
    if lead.is_suppressed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot place call: This contact is on the Do-Not-Call suppression list."
        )

    # 2. Check TRAI Calling Window (09:00 - 20:00 IST)
    settings = db.query(ApplicationSettings).first()
    window_start = settings.permitted_hours_start if settings else 9
    window_end = settings.permitted_hours_end if settings else 20

    # Calculate IST hour (UTC + 5:30)
    now_utc = datetime.now(timezone.utc)
    ist_time = now_utc + timedelta(hours=5, minutes=30)
    current_hour_ist = ist_time.hour

    if not (window_start <= current_hour_ist < window_end):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Outbound calling is restricted outside TRAI permitted hours ({window_start}:00 to {window_end}:00 IST). Current IST time: {ist_time.strftime('%H:%M')}."
        )

    # Determine provider and mode
    call_mode = call_request.mode or (settings.calling_mode if settings else "demo")
    provider = "simulated" if call_mode == "demo" else (settings.telephony_provider if settings else "simulated")

    # Create CallRecord
    lang = call_request.language_override or lead.preferred_language or "te"
    new_call = CallRecord(
        lead_id=lead.id,
        campaign_id=call_request.campaign_id,
        provider_call_id=f"call_{int(now_utc.timestamp())}_{lead.id}",
        provider=provider,
        direction="outbound",
        status="in_progress",
        language_used=lang,
        start_time=now_utc,
        cost_inr=0.0,
        transcript=[
            {
                "role": "system",
                "text": f"Outbound call initiated to {lead.contact_name} ({lead.college_name}) in {'Telugu' if lang == 'te' else 'English'}."
            }
        ]
    )
    db.add(new_call)

    # Update lead status
    lead.call_attempts += 1
    lead.last_called_at = now_utc
    lead.status = "in_progress"

    db.commit()
    db.refresh(new_call)
    return new_call


from app.schemas.call import (
    CallOut, CallStartRequest, CallTestRequest,
    CallSimulateTurnRequest, CallSimulateTurnResponse
)
from app.services.conversation_engine import conversation_engine
from app.services.speech.sarvam import sarvam_adapter
from app.models.demo import DemoBooking


@router.post("/simulate-start")
async def simulate_call_start(
    lead_id: int,
    language_override: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start a simulated sales pitch session with a college lead.
    Returns opening greeting in Telugu or English.
    """
    lead = db.query(CollegeLead).filter(CollegeLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if lead.is_suppressed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contact is on Do-Not-Call suppression list."
        )

    opening_text, detected_lang = conversation_engine.get_opening_turn(lead, language_override)

    import uuid
    # Create new call record
    now_utc = datetime.now(timezone.utc)
    call = CallRecord(
        lead_id=lead.id,
        provider_call_id=f"sim_{uuid.uuid4().hex[:12]}_{lead.id}",
        provider="simulated",
        direction="outbound",
        status="in_progress",
        language_used=detected_lang,
        start_time=now_utc,
        duration_seconds=0,
        cost_inr=0.0,
        transcript=[
            {
                "role": "agent",
                "text": opening_text,
                "timestamp": now_utc.isoformat()
            }
        ]
    )
    db.add(call)
    lead.call_attempts += 1
    lead.last_called_at = now_utc
    lead.status = "in_progress"
    db.commit()
    db.refresh(call)

    # High-fidelity bilingual audio synthesis (Sarvam AI with native gTTS fallback)
    audio_b64 = await sarvam_adapter.text_to_speech(opening_text, f"{detected_lang}-IN")

    return {
        "call_id": call.id,
        "agent_response": opening_text,
        "detected_language": detected_lang,
        "call_status": "in_progress",
        "audio_base64": audio_b64,
        "lead": {
            "id": lead.id,
            "college_name": lead.college_name,
            "contact_name": lead.contact_name,
            "phone_number": lead.phone_number,
            "preferred_language": lead.preferred_language
        }
    }


@router.post("/simulate-turn", response_model=CallSimulateTurnResponse)
async def simulate_call_turn(
    request: CallSimulateTurnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process an interactive dialogue turn with the AI sales agent.
    Performs language detection, objection handling, lead qualification, and demo scheduling.
    """
    call = None
    lead = None
    dialog_history = []

    if request.call_id:
        call = db.query(CallRecord).filter(CallRecord.id == request.call_id).first()
        if call:
            lead = db.query(CollegeLead).filter(CollegeLead.id == call.lead_id).first()
            dialog_history = call.transcript or []

    if not lead:
        # Fallback dummy lead for sandbox testing
        lead = CollegeLead(
            college_name="Engineering College (Sandbox)",
            contact_name="Faculty In-Charge",
            phone_number="+919800000000",
            preferred_language=request.language_hint or "te"
        )

    # Record user message in history
    dialog_history.append({
        "role": "lead",
        "text": request.user_speech,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    # Process conversational turn
    result = await conversation_engine.process_turn(
        user_input=request.user_speech,
        dialog_history=dialog_history,
        lead=lead,
        current_lang=request.language_hint or lead.preferred_language or "te"
    )

    # Record agent response in history
    dialog_history.append({
        "role": "agent",
        "text": result["agent_response"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    # Update database record if persistent call exists
    if call:
        call.transcript = list(dialog_history)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(call, "transcript")
        call.status = result["call_status"]
        call.language_used = result["detected_language"]
        if result.get("outcome"):
            call.outcome = result["outcome"]
            lead.status = result["outcome"]

        if result.get("ai_summary"):
            call.ai_summary = result["ai_summary"]

        if result.get("detected_objections"):
            existing = call.detected_objections or []
            call.detected_objections = list(set(existing + result["detected_objections"]))

        # Update duration and cost
        now = datetime.now(timezone.utc)
        if call.start_time:
            delta = int((now - call.start_time.replace(tzinfo=timezone.utc)).total_seconds())
            call.duration_seconds = max(delta, len(dialog_history) * 12)
        else:
            call.duration_seconds = len(dialog_history) * 12

        # 60s pulse calculation
        pulses = (call.duration_seconds + 59) // 60
        call.cost_inr = round(pulses * 0.50, 2)

        # Handle Opt-Out
        if result.get("opt_out_detected"):
            lead.is_suppressed = True
            lead.status = "opted_out"
            suppression = SuppressionRecord(
                phone_number=lead.phone_number,
                reason="Requested opt-out during voice call",
                requested_at=now,
                source="voice_call",
                is_active=True,
                notes=f"Opt-out detected during call #{call.id}"
            )
            db.add(suppression)

        # Handle Demo Booking
        if result.get("demo_booking"):
            booking_info = result["demo_booking"]
            demo = DemoBooking(
                lead_id=lead.id,
                call_id=call.id,
                contact_name=booking_info.get("contact_name") or lead.contact_name,
                contact_phone=booking_info.get("contact_phone") or lead.phone_number,
                contact_email=booking_info.get("contact_email") or lead.email,
                scheduled_date=booking_info.get("scheduled_date") or now.strftime("%Y-%m-%d"),
                scheduled_time=booking_info.get("scheduled_time") or "11:30 AM IST",
                requirements_notes=booking_info.get("requirements_notes") or "Expiring QR Attendance Demonstration",
                status="scheduled"
            )
            db.add(demo)
            call.follow_up_action = f"Demo booked for {demo.scheduled_date} at {demo.scheduled_time}"

        db.commit()

    # High-fidelity bilingual audio synthesis (Sarvam AI with native gTTS fallback)
    audio_b64 = await sarvam_adapter.text_to_speech(result["agent_response"], f"{result['detected_language']}-IN")

    return CallSimulateTurnResponse(
        agent_response=result["agent_response"],
        detected_language=result["detected_language"],
        call_status=result["call_status"],
        outcome=result.get("outcome"),
        detected_objections=result.get("detected_objections", []),
        opt_out_detected=result.get("opt_out_detected", False),
        demo_booking=result.get("demo_booking"),
        ai_summary=result.get("ai_summary"),
        audio_base64=audio_b64
    )


@router.post("/{call_id}/cancel")
def cancel_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel an ongoing call.
    """
    call = db.query(CallRecord).filter(CallRecord.id == call_id).first()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call record not found")

    call.status = "canceled"
    call.end_time = datetime.now(timezone.utc)
    db.commit()
    db.refresh(call)
    return {"message": "Call canceled successfully", "call_id": call_id}
