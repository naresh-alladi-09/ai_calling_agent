import time
import pytest
from fastapi.testclient import TestClient
from app.main import app, init_db_data
from app.core.database import SessionLocal
from app.models.lead import CollegeLead
from app.models.compliance import SuppressionRecord
from app.models.call import CallRecord
from app.models.demo import DemoBooking

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db_data()


def get_auth_token():
    resp = client.post("/api/auth/login", json={"email": "admin@nani-caller.ai", "password": "Admin@123456"})
    return resp.json()["access_token"]


def test_telugu_and_english_openings():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Start Telugu Call Simulation with sample lead
    resp_te = client.post("/api/calls/simulate-start?lead_id=1&language_override=te", headers=headers)
    assert resp_te.status_code == 200
    data_te = resp_te.json()
    assert data_te["detected_language"] == "te"
    assert "నమస్కారం" in data_te["agent_response"]

    # 2. Start English Call Simulation
    resp_en = client.post("/api/calls/simulate-start?lead_id=1&language_override=en", headers=headers)
    assert resp_en.status_code == 200
    data_en = resp_en.json()
    assert data_en["detected_language"] == "en"
    assert "Hello" in data_en["agent_response"]


def test_objection_handling_existing_software():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Start call
    start_resp = client.post("/api/calls/simulate-start?lead_id=1&language_override=en", headers=headers)
    call_id = start_resp.json()["call_id"]

    # Faculty says they already have software
    turn_resp = client.post("/api/calls/simulate-turn", json={
        "call_id": call_id,
        "user_speech": "We already have an ERP software for our college.",
        "language_hint": "en"
    }, headers=headers)

    assert turn_resp.status_code == 200
    reply = turn_resp.json()
    # Verifies agent explained proxy-proof QR attendance and offered quick demo
    assert "QR" in reply["agent_response"]
    assert "proxy" in reply["agent_response"].lower()
    assert len(reply["detected_objections"]) > 0


def test_opt_out_enforcement():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create a fresh lead specifically for opt-out test
    epoch = int(time.time())
    new_lead = client.post("/api/leads", json={
        "college_name": "Test Engineering Institute",
        "contact_name": "Dr. Test Faculty",
        "phone_number": f"91{str(epoch)[-8:]}",
        "preferred_language": "en"
    }, headers=headers).json()
    lead_id = new_lead["id"]

    start_resp = client.post(f"/api/calls/simulate-start?lead_id={lead_id}&language_override=en", headers=headers)
    assert start_resp.status_code == 200
    call_id = start_resp.json()["call_id"]

    # Faculty requests Do-Not-Call opt out
    turn_resp = client.post("/api/calls/simulate-turn", json={
        "call_id": call_id,
        "user_speech": "Please remove my number and stop calling.",
        "language_hint": "en"
    }, headers=headers)

    assert turn_resp.status_code == 200
    reply = turn_resp.json()
    assert reply["opt_out_detected"] is True
    assert reply["call_status"] == "completed"
    assert reply["outcome"] == "opted_out"

    # Verifies that subsequent call to this lead is blocked by compliance check
    blocked_resp = client.post(f"/api/calls/simulate-start?lead_id={lead_id}", headers=headers)
    assert blocked_resp.status_code == 403


def test_demo_scheduling_extraction():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    start_resp = client.post("/api/calls/simulate-start?lead_id=3&language_override=en", headers=headers)
    call_id = start_resp.json()["call_id"]

    # Faculty agrees to schedule a demo
    turn_resp = client.post("/api/calls/simulate-turn", json={
        "call_id": call_id,
        "user_speech": "Yes, please schedule a 10-minute online demo for tomorrow morning.",
        "language_hint": "en"
    }, headers=headers)

    assert turn_resp.status_code == 200
    reply = turn_resp.json()
    assert reply["outcome"] == "demo_requested"
    assert reply["demo_booking"] is not None
    assert "tomorrow" in reply["agent_response"].lower() or "11:30" in reply["agent_response"]


def test_webhook_idempotency():
    unique_sid = f"exotel_call_{int(time.time() * 1000)}"
    # Send webhook event
    payload = {
        "CallSid": unique_sid,
        "Status": "completed",
        "Duration": "85",
        "RecordingUrl": f"https://s3.ap-south-1.amazonaws.com/telephony/{unique_sid}.wav"
    }

    # 1. First event
    resp1 = client.post("/api/webhooks/telephony", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "processed"

    # 2. Duplicate replayed event (must be ignored idempotently)
    resp2 = client.post("/api/webhooks/telephony", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ignored"
    assert resp2.json()["reason"] == "duplicate_event"


def test_trai_compliance_checker():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Audit an invalid phone
    bad_resp = client.get("/api/compliance/check?phone_number=123", headers=headers)
    assert bad_resp.status_code == 200
    assert bad_resp.json()["is_allowed"] is False

    # Audit a valid phone
    good_resp = client.get("/api/compliance/check?phone_number=9848011223", headers=headers)
    assert good_resp.status_code == 200
    assert "window_start" in good_resp.json()
