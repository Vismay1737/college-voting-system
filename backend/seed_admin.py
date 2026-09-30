import asyncio
import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.database import engine, Base
from app.models.admin import Admin
from app.models.voter import Voter, Class  # noqa: F401
from app.models.election import (  # noqa: F401
    Election, Post, Candidate, VoterParticipation, Ballot, BallotSelection,
    ElectionEligibleClass,
)
from app.models.audit_log import AuditLog  # noqa: F401
from app.utils.security import hash_password

async def main():
    print("Connecting to database & creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        from sqlalchemy import select
        res = await session.execute(select(Admin).where(Admin.username == "admin"))
        existing = res.scalar_one_or_none()
        if existing:
            print("Admin user 'admin' already exists in Neon database!")
            return

        admin = Admin(
            username="admin",
            password_hash=hash_password("admin1234"),
            is_active=True
        )
        session.add(admin)
        await session.commit()
        print("✓ Admin user 'admin' with password 'admin1234' successfully created in Neon DB!")

if __name__ == "__main__":
    asyncio.run(main())
