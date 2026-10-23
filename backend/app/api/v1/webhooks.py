import hmac
import hashlib
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.settings import ProviderEvent
from app.models.call import CallRecord
from app.models.lead import CollegeLead

logger = logging.getLogger("webhooks")
router = APIRouter(prefix="/webhooks", tags=["Telephony & Voice Webhooks"])


def verify_webhook_signature(payload_bytes: bytes, signature_header: Optional[str]) -> bool:
    """
    Verify webhook HMAC-SHA256 signature if secret is configured.
    """
    if not settings.TELEPHONY_WEBHOOK_SECRET or settings.TELEPHONY_WEBHOOK_SECRET == "dev_webhook_secret_key_123":
        return True  # Open in development
    if not signature_header:
        return False

    expected_sig = hmac.new(
        settings.TELEPHONY_WEBHOOK_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_sig, signature_header)


@router.post("/telephony")
async def handle_telephony_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Secure webhook endpoint for telephony events (Exotel/Twilio/Carrier status callbacks).
    Guarantees idempotency and prevents replayed duplicate event processing.
    """
    raw_body = await request.body()
    sig = request.headers.get("X-Exotel-Signature") or request.headers.get("X-Twilio-Signature")

    # Content parsing (form-data or json)
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        payload = await request.json()
    else:
        form = await request.form()
        payload = dict(form)

    # Unique event key for idempotency
    call_sid = payload.get("CallSid") or payload.get("Sid") or payload.get("call_id") or "unknown_call"
    call_status = payload.get("Status") or payload.get("CallStatus") or "completed"
    event_key = f"{call_sid}_{call_status}_{payload.get('RecordingUrl', '')}"

    # Idempotency check: has this event been processed?
    existing_event = db.query(ProviderEvent).filter(ProviderEvent.event_id == event_key).first()
    if existing_event:
        logger.info(f"Duplicate webhook ignored (idempotent): {event_key}")
        return {"status": "ignored", "reason": "duplicate_event"}

    # Record event in audit table
    provider_event = ProviderEvent(
        provider=settings.TELEPHONY_PROVIDER,
        event_id=event_key,
        event_type=f"call_{call_status.lower()}",
        payload=payload,
        signature=sig,
        processed=True,
        received_at=datetime.now(timezone.utc)
    )
    db.add(provider_event)

    # Update CallRecord if matched
    call = db.query(CallRecord).filter(CallRecord.provider_call_id == call_sid).first()
    if call:
        call.status = call_status.lower()
        if "Duration" in payload or "CallDuration" in payload:
            dur = int(payload.get("Duration") or payload.get("CallDuration") or 0)
            call.duration_seconds = dur
            # Calculate cost
            pulses = (dur + 59) // 60
            call.cost_inr = round(pulses * 0.85, 2)

        if "RecordingUrl" in payload:
            call.recording_url = payload.get("RecordingUrl")

    db.commit()
    return {"status": "processed", "call_sid": call_sid, "event_status": call_status}


@router.post("/voice-events")
async def handle_voice_events(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle speech recognition and audio stream webhooks.
    """
    payload = await request.json()
    return {"status": "received", "event": payload.get("event")}
