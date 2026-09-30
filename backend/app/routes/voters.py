from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional

from app.database import get_db
from app.models.admin import Admin
from app.models.voter import Voter, Class
from app.models.audit_log import AuditLog
from app.dependencies import get_current_admin
from app.schemas.schemas import (
    VoterResponse, ImportPreviewResponse, ImportValidationResponse,
    ImportConfirmRequest, ImportResultResponse, VoterCredential,
    PasswordResetResponse,
)
from app.utils.security import hash_password, generate_voter_password
from app.utils.excel import parse_excel_file, detect_column_mapping, validate_import_data

router = APIRouter(prefix="/admin/voters", tags=["Voters"])

# Temporary storage for uploaded Excel data (per-session)
# In production, use Redis or database-backed session
_upload_cache: dict = {}


@router.get("/", response_model=list[VoterResponse])
async def list_voters(
    search: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None),
    has_voted: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List voters with filtering and pagination."""
    query = select(Voter)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Voter.usn.ilike(search_term),
                Voter.name.ilike(search_term),
            )
        )

    if class_id is not None:
        query = query.where(Voter.class_id == class_id)

    if has_voted is not None:
        query = query.where(Voter.has_voted == has_voted)

    if is_active is not None:
        query = query.where(Voter.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Voter.usn).offset(offset).limit(page_size)

    result = await db.execute(query)
    voters = result.scalars().all()

    response = []
    for v in voters:
        class_name = None
        if v.class_rel:
            class_name = v.class_rel.name
        response.append(VoterResponse(
            id=v.id,
            usn=v.usn,
            name=v.name,
            class_id=v.class_id,
            class_name=class_name,
            is_active=v.is_active,
            has_voted=v.has_voted,
            created_at=v.created_at,
            updated_at=v.updated_at,
        ))

    return response


@router.get("/count")
async def get_voter_count(
    search: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None),
    has_voted: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get total voter count with filters."""
    query = select(func.count(Voter.id))

    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Voter.usn.ilike(search_term),
                Voter.name.ilike(search_term),
            )
        )

    if class_id is not None:
        query = query.where(Voter.class_id == class_id)

    if has_voted is not None:
        query = query.where(Voter.has_voted == has_voted)

    if is_active is not None:
        query = query.where(Voter.is_active == is_active)

    result = await db.execute(query)
    return {"count": result.scalar() or 0}


@router.post("/upload-excel", response_model=ImportPreviewResponse)
async def upload_excel(
    file: UploadFile = File(...),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload an Excel file and return a preview with auto-detected columns."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx files are supported",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 10MB.",
        )

    parsed = parse_excel_file(content)
    if parsed["error"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse Excel file: {parsed['error']}",
        )

    if not parsed["headers"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excel file has no headers",
        )

    if parsed["total_rows"] == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excel file has no data rows",
        )

    detected_mapping = detect_column_mapping(parsed["headers"])

    # Cache the parsed data for this admin
    _upload_cache[admin.id] = {
        "rows": parsed["rows"],
        "headers": parsed["headers"],
    }

    # Log
    audit = AuditLog(
        action="excel_uploaded",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Uploaded Excel file: {file.filename} ({parsed['total_rows']} rows)",
    )
    db.add(audit)
    await db.commit()

    return ImportPreviewResponse(
        headers=parsed["headers"],
        detected_mapping=detected_mapping,
        sample_rows=parsed["rows"][:10],
        total_rows=parsed["total_rows"],
    )


@router.post("/validate-import", response_model=ImportValidationResponse)
async def validate_import(
    mapping: ImportConfirmRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Validate the import data with selected column mappings."""
    cached = _upload_cache.get(admin.id)
    if not cached:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded file found. Please upload an Excel file first.",
        )

    # Get existing USNs
    result = await db.execute(select(Voter.usn))
    existing_usns = {row[0] for row in result.all()}

    validation = validate_import_data(
        rows=cached["rows"],
        usn_column=mapping.usn_column,
        name_column=mapping.name_column,
        class_column=mapping.class_column,
        existing_usns=existing_usns,
    )

    return ImportValidationResponse(**validation)


@router.post("/confirm-import", response_model=ImportResultResponse)
async def confirm_import(
    mapping: ImportConfirmRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Import valid students from the uploaded Excel file."""
    cached = _upload_cache.get(admin.id)
    if not cached:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded file found. Please upload an Excel file first.",
        )

    # Get existing USNs
    result = await db.execute(select(Voter.usn))
    existing_usns = {row[0] for row in result.all()}

    validation = validate_import_data(
        rows=cached["rows"],
        usn_column=mapping.usn_column,
        name_column=mapping.name_column,
        class_column=mapping.class_column,
        existing_usns=existing_usns,
    )

    credentials = []
    errors = []

    for student in validation["valid"]:
        try:
            # Get or create class if specified
            class_id = None
            class_name = student.get("class", "").strip()
            if class_name:
                class_result = await db.execute(
                    select(Class).where(Class.name == class_name)
                )
                cls = class_result.scalar_one_or_none()
                if not cls:
                    cls = Class(name=class_name)
                    db.add(cls)
                    await db.flush()
                class_id = cls.id

            # Generate password
            plaintext_password = generate_voter_password()
            password_hash = hash_password(plaintext_password)

            # Create voter
            voter = Voter(
                usn=student["usn"],
                name=student.get("name", ""),
                class_id=class_id,
                password_hash=password_hash,
                is_active=True,
                has_voted=False,
            )
            db.add(voter)

            credentials.append(VoterCredential(
                usn=student["usn"],
                name=student.get("name", ""),
                class_name=class_name,
                password=plaintext_password,
            ))

        except Exception as e:
            errors.append({
                "usn": student["usn"],
                "error": str(e),
            })

    # Audit log
    audit = AuditLog(
        action="voters_imported",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Imported {len(credentials)} voters from Excel",
    )
    db.add(audit)

    await db.commit()

    # Clear cache
    _upload_cache.pop(admin.id, None)

    return ImportResultResponse(
        imported_count=len(credentials),
        credentials=credentials,
        errors=errors,
    )


@router.put("/{voter_id}/toggle-active")
async def toggle_voter_active(
    voter_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable a voter."""
    result = await db.execute(select(Voter).where(Voter.id == voter_id))
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")

    voter.is_active = not voter.is_active

    action = "voter_enabled" if voter.is_active else "voter_disabled"
    audit = AuditLog(
        action=action,
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"{action}: {voter.usn}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(voter)

    return {
        "id": voter.id,
        "usn": voter.usn,
        "is_active": voter.is_active,
    }


@router.post("/{voter_id}/reset-password", response_model=PasswordResetResponse)
async def reset_voter_password(
    voter_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset a voter's password and return the new one."""
    result = await db.execute(select(Voter).where(Voter.id == voter_id))
    voter = result.scalar_one_or_none()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")

    new_password = generate_voter_password()
    voter.password_hash = hash_password(new_password)

    audit = AuditLog(
        action="password_reset",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Password reset for voter: {voter.usn}",
    )
    db.add(audit)

    await db.commit()

    return PasswordResetResponse(
        usn=voter.usn,
        new_password=new_password,
    )
