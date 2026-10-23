from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import UserLogin, UserOut, Token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user via JSON or Form Data and return JWT bearer token.
    """
    email = None
    password = None

    # Check content type: JSON or form-data
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
    else:
        # Form data fallback (e.g. Swagger UI or standard form post)
        form = await request.form()
        email = form.get("username") or form.get("email")
        password = form.get("password")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )

    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")

    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout currently authenticated session.
    """
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Return currently authenticated user profile.
    """
    return current_user


@router.post("/seed-admin", response_model=UserOut)
def seed_admin(db: Session = Depends(get_db)):
    """
    Initialize default application owner admin if no users exist.
    """
    existing_user = db.query(User).first()
    if existing_user:
        return existing_user

    default_admin = User(
        email="admin@nani-caller.ai",
        hashed_password=get_password_hash("Admin@123456"),
        full_name="Nani AI Admin",
        role="admin",
        is_active=True
    )
    db.add(default_admin)
    db.commit()
    db.refresh(default_admin)
    return default_admin
