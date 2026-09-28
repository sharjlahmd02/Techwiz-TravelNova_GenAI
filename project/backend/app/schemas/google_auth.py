from pydantic import BaseModel, Field


class GoogleLoginRequest(BaseModel):
    # The "credential" (Google ID token) returned by the Sign in with Google button.
    credential: str = Field(min_length=10)