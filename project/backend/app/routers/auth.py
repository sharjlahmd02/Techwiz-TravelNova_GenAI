from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.google_auth import GoogleLoginRequest
from app.schemas.user import (
    AccessTokenResponse,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.google_auth_service import GoogleAuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.login(data)


@router.post("/google", response_model=TokenResponse)
async def google_login(data: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """Sign up or log in with a Google ID token. Returns the same payload as /login."""
    service = GoogleAuthService(db)
    return await service.login_or_register(data.credential)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    access_token = await service.refresh(data.refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user