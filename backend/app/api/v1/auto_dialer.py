import csv
import io
import re
import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.lead import CollegeLead
from app.models.call import CallRecord
from app.models.demo import DemoBooking
from app.models.compliance import SuppressionRecord
from app.models.user import User
from app.schemas.lead import normalize_indian_phone
from app.api.deps import get_current_user

router = APIRouter(prefix="/auto-dialer", tags=["Free CSV Autodialer & Live Demo Qualify"])


class DialLeadRequest(BaseModel):
    lead_id: Optional[int] = None
    contact_name: Optional[str] = None
    college_name: Optional[str] = None
    phone_number: Optional[str] = None
    designation: Optional[str] = None
    preferred_language: Optional[str] = "te"  # 'te', 'en'
    email: Optional[str] = None
    forced_outcome: Optional[str] = None  # None (auto), 'demo_requested', 'callback_requested', 'not_interested', 'opted_out'


@router.get("/sample-csv", response_class=PlainTextResponse)
def get_sample_csv():
    """
    Returns a sample CSV formatted for outbound client auto-dialing.
    """
    sample = (
        "college_name,contact_name,designation,phone_number,email,preferred_language\n"
        "JNTU College of Engineering Hyderabad,Dr. K. Srinivas Rao,Principal,+919849012345,principal@jntuh.ac.in,te\n"
        "Chaitanya Bharathi Institute of Technology,Prof. P. Ravinder Reddy,Dean of Academics,+919701045678,dean@cbit.ac.in,en\n"
        "VNR Vignana Jyothi Institute,Dr. B. Govinda Rao,Head of Department,+919440189012,hod_cse@vnrvjiet.ac.in,te\n"
        "Andhra University College of Engineering,Prof. M. Venkateswarlu,Vice Principal,+919885067890,viceprincipal@andhrauniversity.edu.in,te\n"
        "Osmania University College of Technology,Dr. S. Radhika,Controller of Examinations,+919490134567,coe@osmania.ac.in,en\n"
    )
    return sample


@router.get("/sample-leads")
def get_sample_leads(db: Session = Depends(get_db)):
    """
    Return quick-test sample leads from the database or default seeds.
    """
    leads = db.query(CollegeLead).filter(CollegeLead.is_suppressed == False).limit(8).all()
    if leads:
        return [
            {
                "id": l.id,
                "college_name": l.college_name,
                "contact_name": l.contact_name,
                "designation": l.designation or "Dean / Principal",
                "phone_number": l.phone_number,
                "email": l.email,
                "preferred_language": l.preferred_language or "te",
                "status": l.status
            }
            for l in leads
        ]

    # Fallback default seeds
    return [
        {
            "id": 1,
            "college_name": "VNR Vignana Jyothi Institute of Engineering & Technology",
            "contact_name": "Dr. K. Srinivas Rao",
            "designation": "Dean of Academics",
            "phone_number": "+919849012345",
            "email": "academics@vnrvjiet.ac.in",
            "preferred_language": "te",
            "status": "new"
        },
        {
            "id": 2,
            "college_name": "Chaitanya Bharathi Institute of Technology (CBIT)",
            "contact_name": "Dr. P. Ravinder Reddy",
            "designation": "Principal",
            "phone_number": "+919701045678",
            "email": "principal@cbit.ac.in",
            "preferred_language": "en",
            "status": "new"
        },
        {
            "id": 3,
            "college_name": "G. Pulla Reddy Engineering College",
            "contact_name": "Prof. M. Venkateswarlu",
            "designation": "Head of Student Affairs",
            "phone_number": "+919885067890",
            "email": "studentaffairs@gprec.ac.in",
            "preferred_language": "te",
            "status": "new"
        }
    ]


@router.post("/upload-csv")
async def upload_csv_leads(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Parse uploaded CSV of client leads, validate phone numbers, insert into DB,
    and return parsed leads list ready for live auto-dialing.
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV (.csv)"
        )

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = content.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not decode CSV text file")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file appears empty or missing headers")

    # Map column headers flexibly
    def find_col(possible_names: List[str]) -> Optional[str]:
        for p in possible_names:
            for col in reader.fieldnames:
                if p in col.lower().strip().replace(" ", "_"):
                    return col
        return None

    college_col = find_col(["college", "institution", "company", "organization", "school", "client"])
    name_col = find_col(["contact", "name", "person", "client_name"])
    phone_col = find_col(["phone", "mobile", "number", "contact_no"])
    email_col = find_col(["email", "mail"])
    desig_col = find_col(["designation", "role", "title", "position"])
    lang_col = find_col(["language", "lang", "preferred_language"])
    loc_col = find_col(["location", "city", "state", "place"])

    if not name_col or not phone_col:
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain at least 'name' and 'phone' columns. Detected headers: {reader.fieldnames}"
        )

    parsed_leads = []
    errors = []

    for idx, row in enumerate(reader, start=2):
        raw_name = row.get(name_col, "").strip()
        raw_phone = row.get(phone_col, "").strip()
        raw_college = row.get(college_col, "").strip() if college_col else "Enterprise Client"
        raw_email = row.get(email_col, "").strip() if email_col else None
        raw_desig = row.get(desig_col, "").strip() if desig_col else "Decision Maker"
        raw_lang = row.get(lang_col, "te").strip().lower() if lang_col else "te"
        raw_loc = row.get(loc_col, "").strip() if loc_col else "India"

        if not raw_name or not raw_phone:
            continue

        try:
            norm_phone = normalize_indian_phone(raw_phone)
        except ValueError as ve:
            # Fallback format if needed
            digits = re.sub(r"\D", "", raw_phone)
            if len(digits) >= 10:
                norm_phone = f"+91{digits[-10:]}"
            else:
                errors.append(f"Row {idx}: Invalid phone '{raw_phone}'")
                continue

        # Check suppression
        is_supp = db.query(SuppressionRecord).filter(
            SuppressionRecord.phone_number == norm_phone,
            SuppressionRecord.is_active == True
        ).first() is not None

        # Check existing lead in DB
        lead = db.query(CollegeLead).filter(CollegeLead.phone_number == norm_phone).first()
        if not lead:
            lead = CollegeLead(
                college_name=raw_college or "Organization",
                contact_name=raw_name,
                designation=raw_desig,
                phone_number=norm_phone,
                email=raw_email if raw_email and "@" in raw_email else None,
                preferred_language="te" if "te" in raw_lang or "telugu" in raw_lang else ("hi" if "hi" in raw_lang else "en"),
                location=raw_loc,
                contact_source="csv_autodialer",
                consent_status="legitimate_interest",
                consent_source="Uploaded CSV List",
                is_suppressed=is_supp,
                status="opted_out" if is_supp else "new"
            )
            db.add(lead)
            db.commit()
            db.refresh(lead)

        parsed_leads.append({
            "id": lead.id,
            "college_name": lead.college_name,
            "contact_name": lead.contact_name,
            "designation": lead.designation or "Dean / Principal",
            "phone_number": lead.phone_number,
            "email": lead.email,
            "preferred_language": lead.preferred_language,
            "is_suppressed": lead.is_suppressed,
            "status": lead.status
        })

    return {
        "success": True,
        "total_parsed": len(parsed_leads),
        "errors_count": len(errors),
        "errors": errors[:5],
        "leads": parsed_leads
    }


@router.post("/dial-lead")
def execute_autodial_call(
    req: DialLeadRequest,
    db: Session = Depends(get_db)
):
    """
    Executes a simulated free outbound sales call to a client lead.
    Concurrently pitches Student Management System, handles objections,
    extracts outcome, creates DemoBooking if client says yes, and updates database.
    """
    # 1. Resolve lead
    lead = None
    if req.lead_id:
        lead = db.query(CollegeLead).filter(CollegeLead.id == req.lead_id).first()

    if not lead and req.phone_number:
        lead = db.query(CollegeLead).filter(CollegeLead.phone_number == req.phone_number).first()

    if not lead:
        # Create ad-hoc lead from payload
        norm_phone = "+919849012345"
        if req.phone_number:
            try:
                norm_phone = normalize_indian_phone(req.phone_number)
            except Exception:
                norm_phone = req.phone_number

        lead = CollegeLead(
            college_name=req.college_name or "Engineering College",
            contact_name=req.contact_name or "Faculty In-Charge",
            designation=req.designation or "Dean",
            phone_number=norm_phone,
            email=req.email,
            preferred_language=req.preferred_language or "te",
            status="new"
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

    # 2. Check suppression
    if lead.is_suppressed:
        return {
            "lead_id": lead.id,
            "contact_name": lead.contact_name,
            "college_name": lead.college_name,
            "phone_number": lead.phone_number,
            "status": "blocked",
            "outcome": "opted_out",
            "is_demo_booked": False,
            "demo_booking": None,
            "duration_seconds": 0,
            "transcript": [{"role": "system", "text": "Call blocked: Phone number is on Do-Not-Call (DND) suppression list.", "timestamp": "00:00"}],
            "ai_summary": "Call blocked due to active DND suppression entry."
        }

    # 3. Determine simulated conversational scenario
    lang = lead.preferred_language or "te"
    name = lead.contact_name
    college = lead.college_name
    designation = lead.designation or "Sir/Madam"

    # Possible outcomes if not forced:
    # 55% demo agreed, 20% callback requested, 15% info/email requested, 10% not interested
    if req.forced_outcome:
        scenario = req.forced_outcome
    else:
        scenario = random.choices(
            population=["demo_requested", "callback_requested", "info_requested", "not_interested"],
            weights=[0.55, 0.20, 0.15, 0.10],
            k=1
        )[0]

    now_utc = datetime.now(timezone.utc)
    transcript = []
    demo_booking_data = None
    ai_summary = ""

    # Generate realistic dialogue based on scenario and language
    if lang == "te":
        # TELUGU DIALOGUE
        t0 = "నమస్కారం అండి! నేను స్టూడెంట్ మేనేజ్‌మెంట్ సిస్టమ్ టీమ్ నుండి నాని మాట్లాడుతున్నాను. " + college + " " + designation + " " + name + " గారితో మాట్లాడుతున్నానా అండి?"
        transcript.append({"role": "agent", "text": t0, "timestamp": "00:02"})

        if scenario == "demo_requested":
            transcript.append({"role": "lead", "text": "అవును అండి, నేనే మాట్లాడుతున్నాను. మా కాలేజీకి కొత్త అటెండెన్స్ సిస్టమ్ చూడాలనుకుంటున్నాము.", "timestamp": "00:08"})
            transcript.append({
                "role": "agent", 
                "text": "చాలా సంతోషం అండి! మా సిస్టమ్‌లో 30 సెకన్ల dynamic QR అటెండెన్స్ వల్ల విద్యార్థులు ప్రాక్సీ అటెండెన్స్ వేయడం పూర్తిగా ఆగిపోతుంది. అలాగే JNTUH 75% షార్టేజ్ కాలిక్యులేషన్ ఆటోమేటిక్‌గా జరుగుతుంది అండి.",
                "timestamp": "00:18"
            })
            transcript.append({"role": "lead", "text": "చాలా బాగుంది అండి. మా డిపార్ట్‌మెంట్ హెడ్స్‌కి ఒక లైవ్ డెమో చూపిస్తారా? రేపు ఉదయం 11:30 కి వీలవుతుందా?", "timestamp": "00:28"})
            transcript.append({
                "role": "agent",
                "text": "ఖచ్చితంగా అండి! రేపు ఉదయం 11:30 గంటలకు మీతో లైవ్ ఆన్‌లైన్ డెమో షెడ్యూల్ చేశాను అండి. డెమో లింక్ మరియు కాలెండర్ ఇన్వైట్ మీ ఈమెయిల్‌కి మరియు వాట్సాప్‌కి పంపించాము. ధన్యవాదాలు అండి!",
                "timestamp": "00:40"
            })
            ai_summary = f"{name} expressed high interest in QR anti-proxy attendance. Successfully scheduled live demo for tomorrow 11:30 AM IST."

        elif scenario == "callback_requested":
            transcript.append({"role": "lead", "text": "నేను ప్రస్తుతం క్లాస్‌లో ఉన్నాను అండి, మాట్లాడటం కుదరదు.", "timestamp": "00:06"})
            transcript.append({
                "role": "agent",
                "text": "క్షమించండి అండి, మీకు ఇబ్బంది కలిగించినందుకు. రేపు సాయంత్రం 4 గంటలకు మళ్లీ కాల్ చేయమంటారా అండి?",
                "timestamp": "00:12"
            })
            transcript.append({"role": "lead", "text": "సరే అండి, రేపు సాయంత్రం కాల్ చేయండి.", "timestamp": "00:16"})
            transcript.append({"role": "agent", "text": "సరే అండి, రేపు సాయంత్రం 4 గంటలకు ఖచ్చితంగా కాల్ చేస్తాను. మీ సమయానికి ధన్యవాదాలు!", "timestamp": "00:22"})
            ai_summary = f"Prospect busy in class. Requested callback tomorrow evening at 4:00 PM."

        elif scenario == "info_requested":
            transcript.append({"role": "lead", "text": "మాకు సాఫ్ట్‌వేర్ అవసరం ఉంది కానీ ముందు ఫీచర్స్ బ్రోచర్ చూడాలి.", "timestamp": "00:08"})
            transcript.append({
                "role": "agent",
                "text": "ఖచ్చితంగా అండి! మా SMS ఫీచర్స్ PDF మరియు వీడియో డెమో లింక్ మీ నంబర్‌కి వాట్సాప్ చేస్తాను అండి. మీరు చూసిన తర్వాత డెమో ప్లాన్ చేద్దాం.",
                "timestamp": "00:18"
            })
            transcript.append({"role": "lead", "text": "సరే వాట్సాప్‌లో పంపించండి, పరిశీలిస్తాను.", "timestamp": "00:22"})
            ai_summary = "Requested SMS product brochure and video walkthrough on WhatsApp."

        else: # not_interested
            transcript.append({"role": "lead", "text": "మా కాలేజీలో ఇప్పటికే వేరే ERP వాడుతున్నాము అండి, మాకు ప్రస్తుతానికి అవసరం లేదు.", "timestamp": "00:08"})
            transcript.append({
                "role": "agent",
                "text": "సరే అండి, అర్థం చేసుకున్నాను. మీ విలువైన సమయాన్ని ఇచ్చినందుకు చాలా ధన్యవాదాలు! మీ రోజు శుభప్రదంగా గడవాలని కోరుకుంటున్నాను.",
                "timestamp": "00:16"
            })
            ai_summary = "Institution already has active ERP system. Respectfully closed pitch."

    else:
        # ENGLISH DIALOGUE
        t0 = f"Hello! This is Nani from the Student Management System project. Am I speaking with {name}, {designation} at {college}?"
        transcript.append({"role": "agent", "text": t0, "timestamp": "00:02"})

        if scenario == "demo_requested":
            transcript.append({"role": "lead", "text": "Yes speaking. What is this regarding?", "timestamp": "00:06"})
            transcript.append({
                "role": "agent",
                "text": "We have developed an automated Student Management System featuring expiring 30-second QR attendance to eliminate student proxy check-ins, along with automated UGC shortage and SGPA calculation.",
                "timestamp": "00:18"
            })
            transcript.append({"role": "lead", "text": "That is relevant. Can we arrange a demonstration for our academic council on Friday at 11 AM?", "timestamp": "00:28"})
            transcript.append({
                "role": "agent",
                "text": "Absolutely! I have locked in Friday at 11:00 AM IST for your live demonstration. Calendar invite and summary are being sent right now. Thank you so much!",
                "timestamp": "00:38"
            })
            ai_summary = f"{name} requested full academic demo for Friday at 11:00 AM IST. Interested in anti-proxy QR attendance."

        elif scenario == "callback_requested":
            transcript.append({"role": "lead", "text": "I am currently in an executive committee meeting, please call later.", "timestamp": "00:06"})
            transcript.append({"role": "agent", "text": "I apologize for the interruption! Would tomorrow afternoon at 3:00 PM be a convenient time to reconnect?", "timestamp": "00:12"})
            transcript.append({"role": "lead", "text": "Yes, tomorrow 3 PM works.", "timestamp": "00:15"})
            transcript.append({"role": "agent", "text": "Noted! I will ring you tomorrow at 3 PM sharp. Have a productive meeting!", "timestamp": "00:20"})
            ai_summary = "Lead in executive committee meeting. Agreed to callback tomorrow at 3:00 PM."

        elif scenario == "info_requested":
            transcript.append({"role": "lead", "text": "Could you email me the product overview and pricing tiers first?", "timestamp": "00:08"})
            transcript.append({
                "role": "agent",
                "text": "Certainly! I will send the institutional brochure, accreditation audit reports, and pricing models directly to your email.",
                "timestamp": "00:18"
            })
            transcript.append({"role": "lead", "text": "Thank you, I will review it.", "timestamp": "00:22"})
            ai_summary = "Requested brochure and pricing tiers via email."

        else: # not_interested
            transcript.append({"role": "lead", "text": "We are currently tied to a 3-year vendor contract and are not looking to switch.", "timestamp": "00:07"})
            transcript.append({
                "role": "agent",
                "text": "Understood completely! Thank you very much for your time, and have a wonderful day ahead.",
                "timestamp": "00:14"
            })
            ai_summary = "Under existing 3-year vendor contract. Politely closed."

    # 4. Create CallRecord in DB
    duration = 45 if scenario == "demo_requested" else (22 if scenario == "callback_requested" else 18)
    call_rec = CallRecord(
        lead_id=lead.id,
        provider_call_id=f"auto_{uuid.uuid4().hex[:10]}_{lead.id}",
        provider="simulated",
        direction="outbound",
        status="completed",
        outcome=scenario,
        language_used=lang,
        start_time=now_utc - timedelta(seconds=duration),
        end_time=now_utc,
        duration_seconds=duration,
        cost_inr=round(duration / 60.0 * 0.75, 2),  # Simulated pulse rate ₹0.75/min
        transcript=transcript,
        ai_summary=ai_summary,
        detected_objections=["Proxy attendance concerns"] if scenario == "demo_requested" else []
    )
    db.add(call_rec)

    # 5. Update Lead Status
    lead.status = scenario
    lead.last_called_at = now_utc
    lead.call_attempts = (lead.call_attempts or 0) + 1

    # 6. If DEMO BOOKED -> Create DemoBooking record in DB!
    if scenario == "demo_requested":
        # Schedule next business day 11:30 AM
        next_day = (now_utc + timedelta(days=1)).strftime("%Y-%m-%d")
        demo_booking = DemoBooking(
            lead_id=lead.id,
            call_id=call_rec.id,
            contact_name=lead.contact_name,
            contact_phone=lead.phone_number,
            contact_email=lead.email or f"contact@{lead.college_name.lower().replace(' ', '')[:12]}.edu.in",
            scheduled_date=next_day,
            scheduled_time="11:30 AM IST",
            requirements_notes=f"Interested in automated QR attendance and UGC shortage calculation for {lead.college_name}",
            status="scheduled"
        )
        db.add(demo_booking)
        db.commit()
        db.refresh(demo_booking)
        demo_booking_data = {
            "id": demo_booking.id,
            "scheduled_date": demo_booking.scheduled_date,
            "scheduled_time": demo_booking.scheduled_time,
            "requirements_notes": demo_booking.requirements_notes,
            "status": demo_booking.status
        }
    else:
        db.commit()

    db.refresh(call_rec)
    db.refresh(lead)

    return {
        "success": True,
        "lead_id": lead.id,
        "call_id": call_rec.id,
        "contact_name": lead.contact_name,
        "college_name": lead.college_name,
        "phone_number": lead.phone_number,
        "designation": lead.designation,
        "language_used": lang,
        "status": "completed",
        "outcome": scenario,
        "is_demo_booked": scenario == "demo_requested",
        "demo_booking": demo_booking_data,
        "duration_seconds": duration,
        "transcript": transcript,
        "ai_summary": ai_summary
    }
