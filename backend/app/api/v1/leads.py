import csv
import io
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.models.lead import CollegeLead
from app.models.compliance import SuppressionRecord, ConsentRecord
from app.models.user import User
from app.schemas.lead import (
    CollegeLeadCreate, CollegeLeadUpdate, CollegeLeadOut,
    LeadImportResult, normalize_indian_phone
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/leads", tags=["College Leads"])


@router.get("", response_model=List[CollegeLeadOut])
def get_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    language: Optional[str] = None,
    search: Optional[str] = None,
    is_suppressed: Optional[bool] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|college_name|last_called_at|call_attempts)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve college leads with pagination, filtering, search, and sorting.
    """
    query = db.query(CollegeLead)

    if status:
        query = query.filter(CollegeLead.status == status)
    if language:
        query = query.filter(CollegeLead.preferred_language == language)
    if is_suppressed is not None:
        query = query.filter(CollegeLead.is_suppressed == is_suppressed)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                CollegeLead.college_name.ilike(search_pattern),
                CollegeLead.contact_name.ilike(search_pattern),
                CollegeLead.location.ilike(search_pattern),
                CollegeLead.phone_number.ilike(search_pattern),
                CollegeLead.email.ilike(search_pattern)
            )
        )

    # Sort
    col = getattr(CollegeLead, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(col))
    else:
        query = query.order_by(col)

    return query.offset(skip).limit(limit).all()


@router.get("/count")
def get_leads_count(
    status: Optional[str] = None,
    language: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get total count of leads matching query parameters.
    """
    query = db.query(CollegeLead)
    if status:
        query = query.filter(CollegeLead.status == status)
    if language:
        query = query.filter(CollegeLead.preferred_language == language)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                CollegeLead.college_name.ilike(search_pattern),
                CollegeLead.contact_name.ilike(search_pattern),
                CollegeLead.location.ilike(search_pattern),
                CollegeLead.phone_number.ilike(search_pattern)
            )
        )
    return {"total": query.count()}


@router.post("", response_model=CollegeLeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_in: CollegeLeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new college lead. Checks for duplicate phone numbers and active suppression.
    """
    # Duplicate phone check
    existing = db.query(CollegeLead).filter(CollegeLead.phone_number == lead_in.phone_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A lead with phone number {lead_in.phone_number} already exists: {existing.college_name}"
        )

    # Check suppression / DND list
    is_suppressed = db.query(SuppressionRecord).filter(
        SuppressionRecord.phone_number == lead_in.phone_number,
        SuppressionRecord.is_active == True
    ).first() is not None

    db_lead = CollegeLead(
        college_name=lead_in.college_name.strip(),
        location=lead_in.location.strip() if lead_in.location else None,
        contact_name=lead_in.contact_name.strip(),
        designation=lead_in.designation.strip() if lead_in.designation else None,
        phone_number=lead_in.phone_number,
        email=lead_in.email.lower().strip() if lead_in.email else None,
        preferred_language=lead_in.preferred_language,
        contact_source=lead_in.contact_source,
        consent_status=lead_in.consent_status,
        consent_source=lead_in.consent_source,
        consent_timestamp=datetime.now(timezone.utc) if lead_in.consent_status != "pending" else None,
        is_suppressed=is_suppressed,
        status="opted_out" if is_suppressed else "new",
        notes=lead_in.notes
    )
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)

    # Record consent log if consent is asserted
    if lead_in.consent_status in ["explicit_consent", "b2b_inquiry"]:
        consent_log = ConsentRecord(
            lead_id=db_lead.id,
            consent_type=lead_in.consent_status,
            channel="manual_entry",
            proof_reference=lead_in.consent_source or "User input via CRM",
            granted_at=datetime.now(timezone.utc),
            is_active=True
        )
        db.add(consent_log)
        db.commit()

    return db_lead


@router.get("/{lead_id}", response_model=CollegeLeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single college lead by ID.
    """
    lead = db.query(CollegeLead).filter(CollegeLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=CollegeLeadOut)
def update_lead(
    lead_id: int,
    lead_update: CollegeLeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update lead details, consent, or calling status.
    """
    lead = db.query(CollegeLead).filter(CollegeLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    update_data = lead_update.model_dump(exclude_unset=True)

    # If phone is updated, verify uniqueness
    if "phone_number" in update_data and update_data["phone_number"] != lead.phone_number:
        new_phone = update_data["phone_number"]
        existing = db.query(CollegeLead).filter(
            CollegeLead.phone_number == new_phone,
            CollegeLead.id != lead_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Phone number {new_phone} is already used by {existing.college_name}"
            )
        # Check suppression for new phone
        suppressed = db.query(SuppressionRecord).filter(
            SuppressionRecord.phone_number == new_phone,
            SuppressionRecord.is_active == True
        ).first()
        if suppressed:
            lead.is_suppressed = True
            lead.status = "opted_out"

    for field, value in update_data.items():
        setattr(lead, field, value)

    lead.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a college lead.
    """
    lead = db.query(CollegeLead).filter(CollegeLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return None


@router.post("/import", response_model=LeadImportResult)
async def import_leads_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk import college leads from CSV file.
    Expected CSV columns: college_name, contact_name, phone_number, location, designation, email, preferred_language
    Performs validation, normalization to E.164 (+91), deduplication, and suppression list filtering.
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a valid CSV file (.csv)"
        )

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")  # handles potential UTF-8 BOM
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty or missing headers")

    # Normalize header mapping
    header_map = {}
    for col in reader.fieldnames:
        c_clean = col.lower().strip().replace(" ", "_").replace("-", "_")
        header_map[col] = c_clean

    result = LeadImportResult(
        total_processed=0,
        imported_count=0,
        duplicate_count=0,
        invalid_count=0,
        suppressed_count=0,
        errors=[]
    )

    row_num = 1
    new_leads = []
    seen_phones = set()

    for row in reader:
        row_num += 1
        result.total_processed += 1

        norm_row = {header_map[k]: (v.strip() if v else "") for k, v in row.items()}

        college_name = norm_row.get("college_name") or norm_row.get("college") or norm_row.get("institution")
        contact_name = norm_row.get("contact_name") or norm_row.get("name") or norm_row.get("contact_person")
        raw_phone = norm_row.get("phone_number") or norm_row.get("phone") or norm_row.get("mobile") or norm_row.get("contact")

        if not college_name or not contact_name or not raw_phone:
            result.invalid_count += 1
            result.errors.append(f"Row {row_num}: Missing required fields (college_name, contact_name, phone_number)")
            continue

        # Validate and normalize phone
        try:
            phone_e164 = normalize_indian_phone(raw_phone)
        except ValueError as e:
            result.invalid_count += 1
            result.errors.append(f"Row {row_num}: {str(e)}")
            continue

        if phone_e164 in seen_phones:
            result.duplicate_count += 1
            result.errors.append(f"Row {row_num}: Duplicate phone number {phone_e164} in current CSV")
            continue
        seen_phones.add(phone_e164)

        # Check existing in DB
        if db.query(CollegeLead).filter(CollegeLead.phone_number == phone_e164).first():
            result.duplicate_count += 1
            continue

        # Check suppression
        is_suppressed = db.query(SuppressionRecord).filter(
            SuppressionRecord.phone_number == phone_e164,
            SuppressionRecord.is_active == True
        ).first() is not None

        if is_suppressed:
            result.suppressed_count += 1

        lang = norm_row.get("preferred_language") or norm_row.get("language") or "te"
        lang_clean = lang.lower().strip()
        if lang_clean not in ["te", "en"]:
            lang_clean = "te"

        lead = CollegeLead(
            college_name=college_name,
            contact_name=contact_name,
            designation=norm_row.get("designation") or norm_row.get("role") or None,
            location=norm_row.get("location") or norm_row.get("city") or None,
            phone_number=phone_e164,
            email=norm_row.get("email") or None,
            preferred_language=lang_clean,
            contact_source="csv_import",
            consent_status="pending",
            consent_source=f"CSV Import: {file.filename}",
            is_suppressed=is_suppressed,
            status="opted_out" if is_suppressed else "new",
            notes=norm_row.get("notes") or None
        )
        new_leads.append(lead)

    if new_leads:
        db.add_all(new_leads)
        db.commit()
        result.imported_count = len(new_leads)

    return result
