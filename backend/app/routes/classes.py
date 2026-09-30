from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.admin import Admin
from app.models.voter import Class, Voter
from app.models.audit_log import AuditLog
from app.dependencies import get_current_admin
from app.schemas.schemas import ClassCreate, ClassUpdate, ClassResponse

router = APIRouter(prefix="/admin/classes", tags=["Classes"])


@router.get("/", response_model=list[ClassResponse])
async def list_classes(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all classes with student counts."""
    result = await db.execute(select(Class).order_by(Class.name))
    classes = result.scalars().all()

    response = []
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

        response.append(ClassResponse(
            id=cls.id,
            name=cls.name,
            description=cls.description,
            created_at=cls.created_at,
            student_count=student_count,
            voted_count=voted_count,
        ))

    return response


@router.post("/", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    class_data: ClassCreate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new class."""
    # Check for duplicate
    existing = await db.execute(
        select(Class).where(Class.name == class_data.name.strip())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Class '{class_data.name}' already exists",
        )

    new_class = Class(
        name=class_data.name.strip(),
        description=class_data.description,
    )
    db.add(new_class)

    # Audit log
    audit = AuditLog(
        action="class_created",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Created class: {class_data.name}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_class)

    return ClassResponse(
        id=new_class.id,
        name=new_class.name,
        description=new_class.description,
        created_at=new_class.created_at,
        student_count=0,
        voted_count=0,
    )


@router.put("/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: int,
    class_data: ClassUpdate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a class."""
    result = await db.execute(select(Class).where(Class.id == class_id))
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if class_data.name:
        # Check for duplicate name
        existing = await db.execute(
            select(Class).where(Class.name == class_data.name.strip(), Class.id != class_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Class '{class_data.name}' already exists",
            )
        cls.name = class_data.name.strip()

    if class_data.description is not None:
        cls.description = class_data.description

    audit = AuditLog(
        action="class_updated",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Updated class ID {class_id}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(cls)

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

    return ClassResponse(
        id=cls.id,
        name=cls.name,
        description=cls.description,
        created_at=cls.created_at,
        student_count=student_count,
        voted_count=voted_count,
    )


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a class (only if no students assigned)."""
    result = await db.execute(select(Class).where(Class.id == class_id))
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    count_result = await db.execute(
        select(func.count(Voter.id)).where(Voter.class_id == class_id)
    )
    if (count_result.scalar() or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete class with assigned students",
        )

    audit = AuditLog(
        action="class_deleted",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Deleted class: {cls.name}",
    )
    db.add(audit)

    await db.delete(cls)
    await db.commit()
