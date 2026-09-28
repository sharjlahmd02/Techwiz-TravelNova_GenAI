import secrets

from fastapi import HTTPException, status
from google.auth.exceptions import TransportError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import TokenResponse


def _verify_google_token(credential: str) -> dict:
    """Checks signature, expiry, issuer and audience (our client ID) with Google's public keys."""
    return google_id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        settings.GOOGLE_CLIENT_ID,
        clock_skew_in_seconds=10,
    )


class GoogleAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _find_by_email(self, email: str) -> User | None:
        return await self.db.scalar(select(User).where(func.lower(User.email) == email))

    async def login_or_register(self, credential: str) -> TokenResponse:
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google sign-in is not configured",
            )

        try:
            # The Google library is synchronous, so run it off the event loop.
            claims = await run_in_threadpool(_verify_google_token, credential)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc
        except TransportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not reach Google to verify the token",
            ) from exc

        email = (claims.get("email") or "").strip().lower()
        if not email or not claims.get("email_verified"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google account email is not verified",
            )

        user = await self._find_by_email(email)
        if user is None:
            # Sign-up: same defaults as /register (customer role). Google users never type a
            # password, so store the hash of a random one that nobody knows.
            full_name = (claims.get("name") or email.split("@")[0]).strip()[:255] or email
            user = User(
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                full_name=full_name,
                role=UserRole.CUSTOMER,
            )
            self.db.add(user)
            try:
                await self.db.commit()
            except IntegrityError:
                # Two first-time requests raced; the other one created the user.
                await self.db.rollback()
                user = await self._find_by_email(email)
                if user is None:
                    raise
            else:
                await self.db.refresh(user)

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is deactivated")

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
            user=user,
        )