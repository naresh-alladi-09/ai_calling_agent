# Nani AI Sales Caller — Bilingual AI Calling Agent

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00?style=flat)](https://www.sqlalchemy.org)
[![TRAI Compliant](https://img.shields.io/badge/TRAI-TCCCPR%20Compliant-blue)](https://trai.gov.in)
[![Bilingual](https://img.shields.io/badge/Bilingual-Telugu%20%26%20English-emerald)](#)

A complete, production-ready, AI-powered outbound sales calling platform designed to contact college leadership and faculty (Principals, Deans, HODs, Administration) across Andhra Pradesh and Telangana to pitch and schedule demonstrations for an enterprise **Student Management System (SMS)**.

---

## 1. Key Capabilities & Persona

### The AI Agent ("Nani")
- **Persona**: Friendly, professional, respectful, concise Indian male voice. Confident without being aggressive.
- **Bilingual Fluency**: Speaks natural **Telugu** and **Indian English**, with real-time code-switching depending on the recipient's preference.
- **Transparent AI Disclosure**: Introduces itself honestly as an AI calling assistant representing the student management software project. Never pretends to be human and does not repeat tedious disclaimers.
- **Grounded Product Truth**: Explains **only** genuine features existing in the Student Management System. Never hallucinates false testimonials, fake university partnerships, certifications, or unverified claims.
- **Immediate Pitch Cessation**: Ceases the pitch immediately if the recipient declines or asks to be removed.
- **TRAI & DND Suppression**: Enforces 09:00 to 20:00 (9 AM to 8 PM) IST commercial calling hours, duplicate protection, and immediate Do-Not-Call (DND) opt-out suppression.

---

## 2. Telephony & AI Provider Architecture

### Indian Telephony Provider Evaluation: Exotel
- **Regulatory Framework**: In India, outbound commercial communication is governed by TRAI's **TCCCPR 2018 (Telecom Commercial Communications Customer Preference Regulations)**. Commercial calls must use registered **140-series telemarketing numbers** or DLT (Distributed Ledger Technology) virtual numbers tied to an approved Principal Entity.
- **Calling Window**: Permitted calling hours in India are strictly **09:00 AM to 08:00 PM IST**. Outbound dialing outside this window is illegal and automatically blocked by this application's compliance guardrails.
- **Exotel Connect API**: Outbound calls are initiated via `POST /v1/Accounts/{AccountSid}/Calls/connect.json` using HTTP Basic Authentication (`api_key` : `api_token`), bridging the customer to a passthru applet.
- **Pulse-Based Billing**: Telecom in India is billed per 60-second pulse (approx ₹0.60 to ₹1.20 per pulse). The system automatically computes pulse costs for every call.
- **Dual Operating Modes**:
  1. **Demo Mode (Interactive Sandbox)**: Safe in-browser simulation with real-time audio synthesis (WebSpeech / Sarvam), full dialogue turns, qualification extraction, and zero telecom costs.
  2. **Live Mode**: Routes calls through Indian telecom carrier infrastructure via Exotel.

### Speech & LLM Intelligence
- **Sarvam AI (`bulbul:v1` & `saaras:v1`)**: Native Indian multilingual foundational models optimized specifically for Indian languages. Provides native Telugu phonetics, natural Indian English accents, and fast STT/TTS.
- **ElevenLabs (`eleven_multilingual_v2`)**: High-fidelity Indian voice synthesis (`Aditya` / `Arnav` IDs) for lifelike English pitches.
- **OpenAI GPT-4o-mini / GPT-4o**: Orchestrates conversational state, objection handling, intent recognition, structured demo extraction, and DND opt-out triggers.

---

## 3. Technology Stack

- **Backend**:
  - Python 3.10+ / 3.14
  - FastAPI (REST & WebSockets)
  - SQLAlchemy 2.0 ORM
  - Pydantic v2 + Pydantic Settings
  - Alembic Database Migrations
  - PostgreSQL (Production) / SQLite (Zero-dependency local dev)
  - JWT Bearer Authentication (`passlib[bcrypt]`, `python-jose`)
  - Webhooks signature verification & replay idempotency protection
- **Frontend**:
  - React 19 with Vite 8
  - Tailwind CSS v4
  - React Router DOM v7
  - Axios API Client with auth interceptors
  - Recharts for CRM & calling analytics
  - Lucide React modern iconography

---

## 4. Grounded Product Features (Student Management System)

Nani AI is strictly restricted to pitching authentic features from the repository:
1. **Live Expiring QR Code Attendance**:
   - Faculty broadcasts a 30-to-60 second cryptographic dynamic QR token in classrooms.
   - Prevents proxy attendance (token expires before students can photo/share it).
   - Live attendee polling every 3 seconds; database duplicate check-in prevention.
2. **Manual Attendance Register Fallback**:
   - Faculty can mark manual attendance when smartphone policies prohibit devices in class.
3. **Exact Mathematical Shortage Engine**:
   - Calculates monthly and semester attendance percentages against the UGC 75% threshold.
   - Proactively generates shortage lists and student alerts before final exams.
4. **3-Tier Role-Based Access Control (RBAC)**:
   - `ADMIN`: User provisioning, department analytics, audit trails.
   - `TEACHER`: QR session broadcasting, marks entry, class tracking.
   - `STUDENT`: Isolated access to their own attendance and report cards (HTTP 403 prevents seeing peers' records).
5. **UGC SGPA/CGPA Tracking**:
   - Dynamic GPA calculation computed directly from relational records. Zero fabricated metrics.

---

## 5. Local Setup & Windows Installation Guide

### Prerequisites
- Python 3.10+ (`python --version`)
- Node.js v18+ & npm (`node -v`, `npm -v`)
- Git

### Step 1: Clone or Navigate to Directory
```powershell
cd "c:\Users\NARESH\OneDrive\Desktop\customer calling agent"
```

### Step 2: Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in `backend/`:
```powershell
copy .env.example .env
```
Default credentials for local testing:
- **Admin Email**: `admin@nani-caller.ai`
- **Password**: `Admin@123456`
- **Default Database**: `sqlite:///./calling_agent.db` (Works out-of-the-box without installing PostgreSQL).

To switch to **PostgreSQL**:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/nani_sales_caller
```
Run Alembic migrations:
```powershell
.\venv\Scripts\alembic upgrade head
```

### Step 4: Frontend Setup
```powershell
cd ..\frontend
npm install
```

---

## 6. Running the Application

### Option A: One-Click Windows Launcher
Double-click `run_full_system.bat` in the root folder, or run:
```powershell
.\run_full_system.bat
```
This automatically starts:
- **Backend API**: `http://127.0.0.1:8000` (Interactive Swagger Docs: `http://127.0.0.1:8000/docs`)
- **Frontend Dashboard**: `http://localhost:5173`

### Option B: Individual Launchers
- Backend: Run `.\run_backend.bat`
- Frontend: Run `.\run_frontend.bat`

---

## 7. Testing & Verification

The platform includes an automated pytest suite covering 10 integration and unit tests:
```powershell
cd backend
.\venv\Scripts\pytest app/tests/ -v
```

### Test Coverage:
1. `test_health_check`: Verifies system operational status.
2. `test_auth_login_and_me`: Validates JWT token generation, password hashing, and user profile authentication.
3. `test_lead_creation_and_phone_normalization`: Verifies Indian phone normalization (`+91XXXXXXXXXX`) and duplicate rejection (`409 Conflict`).
4. `test_lead_csv_import`: Tests CSV batch ingestion, field mapping, and deduplication.
5. `test_telugu_and_english_openings`: Validates transparent bilingual greetings in Telugu and English.
6. `test_objection_handling_existing_software`: Tests realistic objection handling ("We already have an ERP") focusing on 30s QR attendance.
7. `test_opt_out_enforcement`: Tests immediate Do-Not-Call opt-out detection, suppression recording, and subsequent call blocking (`403 Forbidden`).
8. `test_demo_scheduling_extraction`: Verifies AI demo booking date and time parsing.
9. `test_webhook_idempotency`: Verifies replayed webhook deduplication via `ProviderEvent`.
10. `test_trai_compliance_checker`: Validates 9 AM to 8 PM calling hours check and DND suppression check.

---

## 8. Webhook & Production Telephony Configuration

When deploying with a live provider (e.g. Exotel):
1. Obtain an ngrok or public HTTPS domain:
   ```bash
   ngrok http 8000
   ```
2. Update `.env`:
   ```env
   TELEPHONY_PROVIDER=exotel
   TELEPHONY_PUBLIC_URL=https://your-ngrok-domain.ngrok-free.app
   TELEPHONY_API_KEY=your_exotel_key
   TELEPHONY_API_SECRET=your_exotel_token
   TELEPHONY_ACCOUNT_SID=your_exotel_sid
   TELEPHONY_VIRTUAL_NUMBER=+918000123456
   ```
3. In Exotel Dashboard:
   - Configure Applet Passthru URL: `https://your-domain.com/api/webhooks/telephony`
   - Configure Status Callback URL: `https://your-domain.com/api/webhooks/telephony`
   - Set Webhook Signature Secret in `.env`: `TELEPHONY_WEBHOOK_SECRET=your_secret`

---

## 9. Security & Compliance Checklist

- [x] Passwords hashed using `bcrypt`
- [x] JWT tokens with configurable expiration (24h)
- [x] No private API keys exposed to the frontend
- [x] Replay attack and duplicate webhook protection
- [x] Indian phone validation (+91 standard E.164, mobile prefixes 6-9)
- [x] Strict TRAI calling window guardrails (09:00 - 20:00 IST)
- [x] One-click opt-out and permanent Do-Not-Call suppression list
- [x] Global Emergency Stop Kill-Switch to abort all active calling campaigns
- [x] Zero-hallucination knowledge guardrails grounded in authentic SMS features
