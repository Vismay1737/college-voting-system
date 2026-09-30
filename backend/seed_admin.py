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
        
        target_users = [
            ("vismay", "vismayvm943@"),
            ("visamy", "vismayvm943@"),
            ("admin", "vismayvm943@")
        ]

        for u_name, u_pass in target_users:
            res = await session.execute(select(Admin).where(Admin.username == u_name))
            existing = res.scalar_one_or_none()
            if existing:
                existing.password_hash = hash_password(u_pass)
                print(f"Updated password for admin user '{u_name}'")
            else:
                admin = Admin(
                    username=u_name,
                    password_hash=hash_password(u_pass),
                    is_active=True
                )
                session.add(admin)
                print(f"Created admin user '{u_name}'")

        await session.commit()
        print("All admin accounts initialized successfully in Neon DB!")

if __name__ == "__main__":
    asyncio.run(main())
