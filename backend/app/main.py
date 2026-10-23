import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.lead import CollegeLead
from app.models.settings import ApplicationSettings
from app.api.v1.auth import router as auth_router
from app.api.v1.leads import router as leads_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.calls import router as calls_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.demos import router as demos_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.settings import router as settings_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.auto_dialer import router as auto_dialer_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nani_caller")


def init_db_data():
    """Ensure database tables exist and seed initial admin & settings."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed default admin if not exists
        admin = db.query(User).filter(User.email == "admin@nani-caller.ai").first()
        if not admin:
            admin = User(
                email="admin@nani-caller.ai",
                hashed_password=get_password_hash("Admin@123456"),
                full_name="Nani AI Administrator",
                role="admin",
                is_active=True
            )
            db.add(admin)
            logger.info("Created default admin: admin@nani-caller.ai / Admin@123456")

        # 2. Seed application settings if not exists
        app_settings = db.query(ApplicationSettings).first()
        if not app_settings:
            app_settings = ApplicationSettings(
                calling_mode="demo",
                permitted_hours_start=settings.TRAI_CALLING_WINDOW_START_HOUR,
                permitted_hours_end=settings.TRAI_CALLING_WINDOW_END_HOUR,
                max_daily_budget=1000.0,
                current_day_expenditure=0.0,
                telephony_provider=settings.TELEPHONY_PROVIDER,
                voice_provider=settings.DEFAULT_VOICE_PROVIDER,
                default_llm_model=settings.LLM_MODEL
            )
            db.add(app_settings)
            logger.info("Initialized default application settings in DEMO mode")

        # 3. Seed starter college leads if database is empty
        lead_count = db.query(CollegeLead).count()
        if lead_count == 0:
            sample_leads = [
                CollegeLead(
                    college_name="VNR Vignana Jyothi Institute of Engineering & Technology",
                    location="Hyderabad, Telangana",
                    contact_name="Dr. K. Srinivas Rao",
                    designation="Dean of Academics",
                    phone_number="+919849012345",
                    email="academics@vnrvjiet.ac.in",
                    preferred_language="te",
                    contact_source="directory",
                    consent_status="legitimate_interest",
                    consent_source="B2B College Outreach Directory",
                    status="new",
                    notes="Premier engineering college, interested in automated attendance and SGPA tracking"
                ),
                CollegeLead(
                    college_name="G. Pulla Reddy Engineering College",
                    location="Kurnool, Andhra Pradesh",
                    contact_name="Prof. M. Venkateswarlu",
                    designation="Principal",
                    phone_number="+919885067890",
                    email="principal@gprec.ac.in",
                    preferred_language="te",
                    contact_source="directory",
                    consent_status="legitimate_interest",
                    consent_source="B2B College Outreach Directory",
                    status="new",
                    notes="Autonomous institution with 4000+ students; currently uses manual paper registers"
                ),
                CollegeLead(
                    college_name="Chaitanya Bharathi Institute of Technology (CBIT)",
                    location="Gandipet, Hyderabad",
                    contact_name="Dr. P. Ravinder Reddy",
                    designation="Head of Student Affairs",
                    phone_number="+919701045678",
                    email="studentaffairs@cbit.ac.in",
                    preferred_language="en",
                    contact_source="directory",
                    consent_status="legitimate_interest",
                    consent_source="B2B College Outreach Directory",
                    status="new",
                    notes="Prefers English discussions; looking for live QR attendance to stop proxy attendance"
                ),
                CollegeLead(
                    college_name="Gayatri Vidya Parishad College of Engineering",
                    location="Visakhapatnam, Andhra Pradesh",
                    contact_name="Dr. B. Govinda Rao",
                    designation="Vice Principal & Controller of Examinations",
                    phone_number="+919440189012",
                    email="coe@gvpce.ac.in",
                    preferred_language="te",
                    contact_source="directory",
                    consent_status="legitimate_interest",
                    consent_source="B2B College Outreach Directory",
                    status="new",
                    notes="Focuses on examination automation and shortage rules calculation"
                ),
                CollegeLead(
                    college_name="Kakatiya Institute of Technology & Science",
                    location="Warangal, Telangana",
                    contact_name="Prof. K. Ashoka Reddy",
                    designation="Principal",
                    phone_number="+919490134567",
                    email="principal@kitsw.ac.in",
                    preferred_language="te",
                    contact_source="directory",
                    consent_status="legitimate_interest",
                    consent_source="B2B College Outreach Directory",
                    status="new",
                    notes="Wants demonstration for department heads"
                )
            ]
            db.add_all(sample_leads)
            logger.info("Seeded 5 sample Andhra Pradesh & Telangana college leads")

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error initializing DB data: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Nani AI Sales Caller Backend...")
    init_db_data()
    yield
    # Shutdown
    logger.info("Shutting down Nani AI Sales Caller Backend...")


app = FastAPI(
    title="Nani AI Sales Caller API",
    description="Outbound Bilingual AI Sales-Calling Platform for Student Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup: explicitly allow Vite dev server, preview, and local URLs with credentials
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register All Routers
app.include_router(auth_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(calls_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(demos_router, prefix="/api")
app.include_router(compliance_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(auto_dialer_router, prefix="/api")


@app.get("/", tags=["System"])
def root():
    return {
        "name": "Nani AI Sales Caller API",
        "status": "online",
        "environment": settings.APP_ENV,
        "docs_url": "/docs",
        "health_url": "/api/health",
        "version": "1.0.0"
    }


@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "telephony_provider": settings.TELEPHONY_PROVIDER,
        "database": "connected"
    }
