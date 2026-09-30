#!/usr/bin/env python3
"""
First-time admin setup script.
Run: docker compose exec backend python create_admin.py
"""
import sys
import getpass

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base
from app.models.admin import Admin
from app.models.voter import Voter, Class  # noqa: F401
from app.models.election import (  # noqa: F401
    Election, Post, Candidate, VoterParticipation, Ballot, BallotSelection,
    ElectionEligibleClass,
)
from app.models.audit_log import AuditLog  # noqa: F401
from app.utils.security import hash_password

settings = get_settings()


def create_admin():
    """Interactive admin creation."""
    # Use sync engine for CLI script
    sync_url = settings.DATABASE_URL_SYNC
    engine = create_engine(sync_url)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    print("\n" + "=" * 50)
    print("  COLLEGE ELECTION SYSTEM — Admin Setup")
    print("=" * 50 + "\n")

    username = input("Admin username: ").strip()
    if not username:
        print("Error: Username cannot be empty.")
        sys.exit(1)

    if len(username) < 3:
        print("Error: Username must be at least 3 characters.")
        sys.exit(1)

    password = getpass.getpass("Admin password: ")
    if len(password) < 8:
        print("Error: Password must be at least 8 characters.")
        sys.exit(1)

    confirm_password = getpass.getpass("Confirm password: ")
    if password != confirm_password:
        print("Error: Passwords do not match.")
        sys.exit(1)

    with Session(engine) as session:
        # Check if username already exists
        existing = session.execute(
            select(Admin).where(Admin.username == username)
        ).scalar_one_or_none()

        if existing:
            print(f"\nError: Admin '{username}' already exists.")
            sys.exit(1)

        # Create admin
        admin = Admin(
            username=username,
            password_hash=hash_password(password),
            is_active=True,
        )
        session.add(admin)

        # Audit log
        audit = AuditLog(
            action="admin_created",
            actor_type="system",
            actor_name="setup_script",
            details=f"Admin account created: {username}",
        )
        session.add(audit)

        session.commit()

    print(f"\n✓ Admin '{username}' created successfully!")
    print("  You can now log in at /admin/login\n")


if __name__ == "__main__":
    create_admin()
