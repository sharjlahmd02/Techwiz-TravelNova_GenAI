from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""
    
    CORS_ORIGINS: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"

    # Email complaint intake (doc/supportnova-email-complaint-flow.md) -- IMAP fetch +
    # SMTP auto-reply against the official complaint inbox. Feature is a no-op (poller
    # never starts) unless EMAIL_INTAKE_ENABLED is true and credentials are set.
    EMAIL_INTAKE_ENABLED: bool = False
    EMAIL_INTAKE_ADDRESS: str = ""
    EMAIL_IMAP_HOST: str = "imap.gmail.com"
    EMAIL_IMAP_PORT: int = 993
    EMAIL_SMTP_HOST: str = "smtp.gmail.com"
    EMAIL_SMTP_PORT: int = 587
    EMAIL_USERNAME: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_POLL_INTERVAL_MINUTES: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
