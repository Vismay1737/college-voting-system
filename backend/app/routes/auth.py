from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.admin import Admin
from app.models.voter import Voter
from app.models.audit_log import AuditLog
from app.schemas.schemas import LoginRequest, VoterLoginRequest, TokenResponse
from app.utils.security import verify_password, create_access_token, hash_ip

router = APIRouter(tags=["Authentication"])


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Admin login endpoint."""
    result = await db.execute(
        select(Admin).where(Admin.username == login_data.username)
    )
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(login_data.password, admin.password_hash):
        # Log failed attempt
        audit = AuditLog(
            action="admin_login_failed",
            actor_type="admin",
            actor_name=login_data.username,
            details=f"Failed login attempt for username: {login_data.username}",
            ip_hash=hash_ip(request.client.host if request.client else "unknown"),
        )
        db.add(audit)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled",
        )

    token = create_access_token(
        data={"sub": str(admin.id), "username": admin.username},
        token_type="admin",
    )

    # Log successful login
    audit = AuditLog(
        action="admin_login",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details="Admin logged in successfully",
        ip_hash=hash_ip(request.client.host if request.client else "unknown"),
    )
    db.add(audit)
    await db.commit()

    return TokenResponse(
        access_token=token,
        user_type="admin",
        user_name=admin.username,
        user_id=admin.id,
    )


@router.post("/voter/login", response_model=TokenResponse)
async def voter_login(
    request: Request,
    login_data: VoterLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Voter login endpoint."""
    usn_upper = login_data.usn.strip().upper()
    result = await db.execute(
        select(Voter).where(Voter.usn == usn_upper)
    )
    voter = result.scalar_one_or_none()

    if not voter or not verify_password(login_data.password, voter.password_hash):
        # Log failed attempt
        audit = AuditLog(
            action="voter_login_failed",
            actor_type="voter",
            actor_name=usn_upper,
            details=f"Failed login attempt for USN: {usn_upper}",
            ip_hash=hash_ip(request.client.host if request.client else "unknown"),
        )
        db.add(audit)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid USN or password",
        )

    if not voter.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Contact the administrator.",
        )

    token = create_access_token(
        data={"sub": str(voter.id), "usn": voter.usn},
        token_type="voter",
    )

    return TokenResponse(
        access_token=token,
        user_type="voter",
        user_name=voter.name or voter.usn,
        user_id=voter.id,
    )
