from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

if DATABASE_URL.startswith("sqlite:///."):
    # Resolve relative SQLite database path relative to backend root directory
    backend_dir = Path(__file__).resolve().parent.parent.parent
    rel_path = DATABASE_URL.replace("sqlite:///.", "").lstrip("/\\")
    abs_db_path = (backend_dir / rel_path).resolve().as_posix()
    resolved_db_url = f"sqlite:///{abs_db_path}"
    engine = create_engine(
        resolved_db_url,
        connect_args={"check_same_thread": False}
    )
elif DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
