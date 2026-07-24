import os
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password, create_access_token

load_dotenv()

router = APIRouter()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest):
    """
    Verify admin credentials and return a JWT access token if valid.
    """
    if credentials.username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    if not verify_password(credentials.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": credentials.username})
    return TokenResponse(access_token=access_token)
