from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.database import get_db
from app.models.admin import Admin
from app.models.audit_log import AuditLog
from app.dependencies import get_current_admin
from app.schemas.schemas import AuditLogResponse

router = APIRouter(prefix="/admin/audit-logs", tags=["Audit Logs"])


@router.get("/", response_model=list[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    actor_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs with filtering and pagination."""
    query = select(AuditLog)

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))

    if actor_type:
        query = query.where(AuditLog.actor_type == actor_type)

    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        AuditLogResponse(
            id=log.id,
            action=log.action,
            actor_type=log.actor_type,
            actor_name=log.actor_name,
            details=log.details,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.get("/count")
async def get_audit_log_count(
    action: Optional[str] = Query(None),
    actor_type: Optional[str] = Query(None),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get total audit log count."""
    query = select(func.count(AuditLog.id))

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))

    if actor_type:
        query = query.where(AuditLog.actor_type == actor_type)

    result = await db.execute(query)
    return {"count": result.scalar() or 0}
