import io
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.demo import DemoBooking
from app.models.call import CallRecord
from app.models.lead import CollegeLead

client = TestClient(app)

def test_auto_dialer_endpoints():
    print("--- 1. Testing GET /api/auto-dialer/sample-csv ---")
    res = client.get("/api/auto-dialer/sample-csv")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "college_name,contact_name,designation,phone_number" in res.text
    print("PASS: Sample CSV generated successfully.")

    print("\n--- 2. Testing GET /api/auto-dialer/sample-leads ---")
    res = client.get("/api/auto-dialer/sample-leads")
    assert res.status_code == 200
    leads = res.json()
    assert len(leads) > 0
    print(f"PASS: Retrieved {len(leads)} sample leads. First: {leads[0]['contact_name']} - {leads[0]['college_name']}")

    print("\n--- 3. Testing POST /api/auto-dialer/upload-csv ---")
    csv_data = (
        "college_name,contact_name,designation,phone_number,email,preferred_language\n"
        "VNR Vignana Jyothi Inst,Dr. Test Principal,Principal,+919998887771,test1@vnr.edu.in,te\n"
        "CBIT Hyderabad,Prof. Academic Dean,Dean,+919998887772,test2@cbit.ac.in,en\n"
    )
    files = {"file": ("test_clients.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post("/api/auto-dialer/upload-csv", files=files)
    assert res.status_code == 200, f"Upload error: {res.text}"
    upload_res = res.json()
    assert upload_res["success"] is True
    assert upload_res["total_parsed"] == 2
    uploaded_leads = upload_res["leads"]
    print(f"PASS: CSV Upload parsed {len(uploaded_leads)} leads successfully.")

    print("\n--- 4. Testing POST /api/auto-dialer/dial-lead (Demo OK Flow) ---")
    lead_1 = uploaded_leads[0]
    dial_payload = {
        "lead_id": lead_1["id"],
        "contact_name": lead_1["contact_name"],
        "college_name": lead_1["college_name"],
        "phone_number": lead_1["phone_number"],
        "preferred_language": lead_1["preferred_language"],
        "forced_outcome": "demo_requested"
    }
    res = client.post("/api/auto-dialer/dial-lead", json=dial_payload)
    assert res.status_code == 200, f"Dial error: {res.text}"
    dial_res = res.json()
    assert dial_res["success"] is True
    assert dial_res["is_demo_booked"] is True
    assert dial_res["outcome"] == "demo_requested"
    assert dial_res["demo_booking"] is not None
    assert dial_res["demo_booking"]["scheduled_date"] is not None
    assert "11:30 AM" in dial_res["demo_booking"]["scheduled_time"]
    assert len(dial_res["transcript"]) >= 4
    print(f"PASS: Demo agreed! Scheduled for: {dial_res['demo_booking']['scheduled_date']} @ {dial_res['demo_booking']['scheduled_time']}")
    print(f"Transcript turns: {len(dial_res['transcript'])}")
    print(f"AI Summary: {dial_res['ai_summary']}")

    print("\n--- 5. Testing POST /api/auto-dialer/dial-lead (Not Interested Flow) ---")
    lead_2 = uploaded_leads[1]
    dial_payload_2 = {
        "lead_id": lead_2["id"],
        "contact_name": lead_2["contact_name"],
        "college_name": lead_2["college_name"],
        "phone_number": lead_2["phone_number"],
        "preferred_language": lead_2["preferred_language"],
        "forced_outcome": "not_interested"
    }
    res = client.post("/api/auto-dialer/dial-lead", json=dial_payload_2)
    assert res.status_code == 200
    dial_res_2 = res.json()
    assert dial_res_2["is_demo_booked"] is False
    assert dial_res_2["outcome"] == "not_interested"
    print(f"PASS: Lead declined handled politely. Summary: {dial_res_2['ai_summary']}")

    print("\n--- 6. Verifying Database Persistence ---")
    db = SessionLocal()
    try:
        latest_demo = db.query(DemoBooking).filter(DemoBooking.contact_phone == lead_1["phone_number"]).first()
        assert latest_demo is not None, "DemoBooking record was not found in DB!"
        assert latest_demo.contact_name == lead_1["contact_name"]
        assert latest_demo.status == "scheduled"
        print(f"PASS: DB Record verified in demo_bookings (ID: {latest_demo.id}, Lead ID: {latest_demo.lead_id})")

        call_rec = db.query(CallRecord).filter(CallRecord.lead_id == lead_1["id"]).first()
        assert call_rec is not None, "CallRecord was not found in DB!"
        assert call_rec.outcome == "demo_requested"
        print(f"PASS: DB Record verified in call_records (ID: {call_rec.id}, Duration: {call_rec.duration_seconds}s)")
    finally:
        db.close()

    print("\n--- 7. Testing GET /api/auto-dialer/tts (Telugu Audio Stream) ---")
    tts_res = client.get("/api/auto-dialer/tts", params={"text": "నమస్కారం అండి! నాని మాట్లాతున్నాను", "lang": "te"})
    assert tts_res.status_code == 200, f"TTS error: {tts_res.status_code}"
    assert tts_res.headers.get("content-type") == "audio/mpeg"
    assert len(tts_res.content) > 1000
    print(f"PASS: Received {len(tts_res.content)} bytes of native Telugu MP3 audio.")

    print("\n==========================================")
    print("ALL AUTO-DIALER ENDPOINTS AND LOGIC PASSED 100%!")
    print("==========================================")

if __name__ == "__main__":
    test_auto_dialer_endpoints()
