import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if "asyncpg" in db_url and "sslmode=" in db_url:
    db_url = db_url.replace("sslmode=", "ssl=")

# Detect serverless environment (Vercel, AWS Lambda, etc.)
is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

engine_kwargs = {"echo": settings.DEBUG}
if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
elif is_serverless:
    # Serverless: use NullPool — no persistent connections
    engine_kwargs["poolclass"] = NullPool
else:
    # Traditional server: use connection pooling
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 5

engine = create_async_engine(
    db_url,
    **engine_kwargs
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup and seed default admin accounts if missing."""
    async with engine.begin() as conn:
        from app.models import (  # noqa: F401
            admin, voter, election, audit_log
        )
        await conn.run_sync(Base.metadata.create_all)

    # Auto-seed default admin accounts if none exist
    try:
        async with async_session_factory() as session:
            from app.models.admin import Admin
            from app.utils.security import hash_password
            from sqlalchemy import select
            
            result = await session.execute(select(Admin))
            admins = result.scalars().all()
            
            existing_usernames = {a.username.lower() for a in admins}
            default_accounts = [
                ("admin", "vismayvm943@"),
                ("vismay", "vismayvm943@"),
                ("visamy", "vismayvm943@"),
            ]

            added = False
            for username, password in default_accounts:
                if username.lower() not in existing_usernames:
                    new_admin = Admin(
                        username=username,
                        password_hash=hash_password(password),
                        is_active=True,
                    )
                    session.add(new_admin)
                    added = True
            
            if added:
                await session.commit()
    except Exception as e:
        print(f"Warning: Auto-seeding default admin error: {e}")

