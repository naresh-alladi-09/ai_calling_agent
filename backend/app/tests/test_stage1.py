import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app, init_db_data
from app.core.database import SessionLocal
from app.models.lead import CollegeLead

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db_data()


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_auth_login_and_me():
    # 1. Invalid login
    bad_login = client.post("/api/auth/login", json={"email": "admin@nani-caller.ai", "password": "WrongPassword"})
    assert bad_login.status_code == 401

    # 2. Valid login
    good_login = client.post("/api/auth/login", json={"email": "admin@nani-caller.ai", "password": "Admin@123456"})
    assert good_login.status_code == 200
    token_data = good_login.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 3. /api/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == "admin@nani-caller.ai"
    assert me_data["role"] == "admin"


def test_lead_creation_and_phone_normalization():
    login_resp = client.post("/api/auth/login", json={"email": "admin@nani-caller.ai", "password": "Admin@123456"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # Generate unique test phone based on current epoch
    unique_suffix = str(int(time.time()))[-8:]
    phone = f"98{unique_suffix}"

    lead_payload = {
        "college_name": "JNTU College of Engineering",
        "location": "Kakinada, AP",
        "contact_name": "Dr. Ramesh Babu",
        "designation": "Principal",
        "phone_number": phone,
        "email": f"principal_{unique_suffix}@jntucek.ac.in",
        "preferred_language": "te",
        "contact_source": "manual",
        "consent_status": "b2b_inquiry"
    }

    # 1. First creation must succeed
    create_resp = client.post("/api/leads", json=lead_payload, headers=headers)
    assert create_resp.status_code == 201
    created_lead = create_resp.json()
    assert created_lead["phone_number"] == f"+91{phone}"
    assert created_lead["status"] == "new"

    # 2. Duplicate phone rejection must return 409
    dup_resp = client.post("/api/leads", json=lead_payload, headers=headers)
    assert dup_resp.status_code == 409


def test_lead_csv_import():
    login_resp = client.post("/api/auth/login", json={"email": "admin@nani-caller.ai", "password": "Admin@123456"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    epoch = int(time.time())
    p1 = f"99{str(epoch)[-8:]}"
    p2 = f"97{str(epoch + 1)[-8:]}"

    csv_content = f"""college_name,contact_name,phone_number,location,designation,preferred_language
Vasavi College of Engineering,Prof. S. Ramachandram,{p1},Hyderabad,Director,te
Sagi Rama Krishnam Raju Engineering College,Dr. M. Jagapathi Raju,{p2},Bhimavaram,Principal,te
"""
    file_tuple = ("leads.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")
    import_resp = client.post("/api/leads/import", files={"file": file_tuple}, headers=headers)
    assert import_resp.status_code == 200
    res = import_resp.json()
    assert res["imported_count"] == 2
    assert res["invalid_count"] == 0
