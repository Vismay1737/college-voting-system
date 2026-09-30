import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


def _find_env_file() -> str | None:
    """Locate the .env file by checking multiple possible locations.

    On Vercel serverless, the CWD and file layout differ from local dev.
    We search upward from this file's directory and also check common
    project-root locations so the same code works everywhere.
    """
    candidates = [
        # Relative to this file: backend/app/config.py → project root
        Path(__file__).resolve().parent.parent.parent / ".env",
        # Relative to CWD (works for local dev)
        Path.cwd() / ".env",
        # One level up from CWD (Vercel runs from api/)
        Path.cwd().parent / ".env",
        # Backend directory itself
        Path(__file__).resolve().parent.parent / ".env",
    ]
    for p in candidates:
        if p.is_file():
            return str(p)
    return None  # Fall back to OS environment variables only


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = "election_admin"
    POSTGRES_PASSWORD: str = "change_this_secure_password_123"
    POSTGRES_DB: str = "election_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_ky6ZjL2nHDKG@ep-royal-silence-b4h3mq1e.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
    DATABASE_URL_SYNC: str = "postgresql://neondb_owner:npg_ky6ZjL2nHDKG@ep-royal-silence-b4h3mq1e.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

    # Security
    SECRET_KEY: str = "change-this-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # Application
    APP_NAME: str = "College Election System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    class Config:
        env_file = _find_env_file()
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
