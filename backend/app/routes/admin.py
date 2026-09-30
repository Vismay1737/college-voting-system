from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.admin import Admin
from app.models.voter import Voter, Class
from app.models.election import Election, ElectionEligibleClass, VoterParticipation
from app.models.audit_log import AuditLog
from app.dependencies import get_current_admin
from app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics."""
    # Total students
    total_result = await db.execute(select(func.count(Voter.id)))
    total_students = total_result.scalar() or 0

    # Class stats
    classes_result = await db.execute(select(Class))
    classes = classes_result.scalars().all()

    class_stats = []
    for cls in classes:
        count_result = await db.execute(
            select(func.count(Voter.id)).where(Voter.class_id == cls.id)
        )
        student_count = count_result.scalar() or 0

        voted_result = await db.execute(
            select(func.count(Voter.id)).where(
                Voter.class_id == cls.id,
                Voter.has_voted == True
            )
        )
        voted_count = voted_result.scalar() or 0

        class_stats.append({
            "id": cls.id,
            "name": cls.name,
            "student_count": student_count,
            "voted_count": voted_count,
            "turnout": round((voted_count / student_count * 100), 2) if student_count > 0 else 0,
        })

    # Registered (active) voters
    active_result = await db.execute(
        select(func.count(Voter.id)).where(Voter.is_active == True)
    )
    registered_voters = active_result.scalar() or 0

    # Votes cast
    voted_result = await db.execute(
        select(func.count(Voter.id)).where(Voter.has_voted == True)
    )
    votes_cast = voted_result.scalar() or 0

    remaining_voters = registered_voters - votes_cast
    turnout = round((votes_cast / registered_voters * 100), 2) if registered_voters > 0 else 0

    # Active election
    election_result = await db.execute(
        select(Election).where(
            Election.status.in_(["DRAFT", "SCHEDULED", "OPEN", "PAUSED"])
        ).order_by(Election.created_at.desc()).limit(1)
    )
    active_election = election_result.scalar_one_or_none()

    active_election_data = None
    election_status = None
    if active_election:
        election_status = active_election.status.value if hasattr(active_election.status, 'value') else active_election.status
        active_election_data = {
            "id": active_election.id,
            "name": active_election.name,
            "status": election_status,
        }

    return DashboardStats(
        total_students=total_students,
        class_stats=class_stats,
        registered_voters=registered_voters,
        votes_cast=votes_cast,
        remaining_voters=remaining_voters,
        turnout_percentage=turnout,
        election_status=election_status,
        active_election=active_election_data,
    )


@router.get("/me")
async def get_admin_profile(
    admin: Admin = Depends(get_current_admin),
):
    """Get current admin info."""
    return {
        "id": admin.id,
        "username": admin.username,
        "is_active": admin.is_active,
    }
