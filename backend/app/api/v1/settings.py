from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.settings import ApplicationSettings
from app.models.user import User
from app.schemas.settings import SettingsUpdate, SettingsOut
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/settings", tags=["Application Settings"])


@router.get("", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(ApplicationSettings).first()
    if not settings:
        settings = ApplicationSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.patch("", response_model=SettingsOut)
def update_settings(
    settings_in: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    settings = db.query(ApplicationSettings).first()
    if not settings:
        settings = ApplicationSettings()
        db.add(settings)

    data = settings_in.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(settings, field, val)

    settings.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)
    return settings
