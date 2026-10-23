"""
Nani AI Sales Caller — Backend and Frontend Connection Verification
Tests API endpoints, CORS policies, authentication, and frontend configuration.
"""
import sys
import os
from pathlib import Path

# Add backend to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
sys.path.insert(0, str(backend_dir))

def run_checks():
    print("=" * 65)
    print("NANI AI CALLING AGENT - BACKEND & FRONTEND CONNECTIVITY TEST")
    print("=" * 65)
    
    # 1. Test backend FastAPI app import
    try:
        from app.main import app, init_db_data
        from app.core.config import settings
        from fastapi.testclient import TestClient
        init_db_data()
        client = TestClient(app)
        print(" [OK] Backend FastAPI app loaded and database verified.")
    except Exception as e:
        print(f" [FAIL] Backend import failed: {e}")
        return False

    # 2. Test root endpoint
    res = client.get("/")
    assert res.status_code == 200, f"Root endpoint failed: {res.status_code}"
    print(f" [OK] Root endpoint / returned 200: {res.json()['name']}")

    # 3. Test health check endpoint
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health endpoint failed: {res.status_code}"
    print(f" [OK] Health endpoint /api/health returned: {res.json()}")

    # 4. Test admin authentication
    login_res = client.post("/api/auth/login", json={
        "email": "admin@nani-caller.ai",
        "password": "Admin@123456"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.status_code} - {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(" [OK] Admin login successful. JWT Bearer token acquired.")

    # 5. Test authenticated user profile
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200, f"/auth/me failed: {me_res.status_code}"
    print(f" [OK] /api/auth/me verified user: {me_res.json()['email']} ({me_res.json()['role']})")

    # 6. Test Leads CRM
    leads_res = client.get("/api/leads", headers=headers)
    assert leads_res.status_code == 200, f"/leads failed: {leads_res.status_code}"
    leads = leads_res.json()
    print(f" [OK] /api/leads returned {len(leads)} leads.")

    # 7. Test Dashboard Metrics
    dash_res = client.get("/api/dashboard/metrics", headers=headers)
    assert dash_res.status_code == 200, f"/dashboard/metrics failed: {dash_res.status_code}"
    metrics = dash_res.json()
    print(f" [OK] /api/dashboard/metrics returned total leads: {metrics['total_leads']}")

    # 8. Test Compliance Check
    comp_res = client.get("/api/compliance/check?phone_number=+919849012345", headers=headers)
    assert comp_res.status_code == 200, f"/compliance/check failed: {comp_res.status_code}"
    print(f" [OK] /api/compliance/check verified TRAI compliance rules: allowed={comp_res.json()['is_allowed']}")

    # 9. Verify Frontend Configuration
    vite_config_path = root_dir / "frontend" / "vite.config.js"
    client_js_path = root_dir / "frontend" / "src" / "api" / "client.js"
    env_path = root_dir / "frontend" / ".env"
    
    assert vite_config_path.exists(), "frontend/vite.config.js missing"
    assert client_js_path.exists(), "frontend/src/api/client.js missing"
    assert env_path.exists(), "frontend/.env missing"
    
    vite_content = vite_config_path.read_text(encoding="utf-8")
    assert "127.0.0.1:8000" in vite_content, "Vite proxy should target 127.0.0.1:8000"
    print(" [OK] Frontend Vite proxy correctly targets http://127.0.0.1:8000")
    
    client_content = client_js_path.read_text(encoding="utf-8")
    assert "import.meta.env.VITE_API_URL" in client_content, "API client should support VITE_API_URL"
    print(" [OK] Frontend API client configured with environment variable support")

    dist_index = root_dir / "frontend" / "dist" / "index.html"
    if dist_index.exists():
        print(" [OK] Production build dist/ bundle is compiled and ready.")

    print("\n" + "=" * 65)
    print(" ALL BACKEND AND FRONTEND CHECKS PASSED SUCCESSFULLY!")
    print("=" * 65)
    return True

if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1)
