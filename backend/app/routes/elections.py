from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.admin import Admin
from app.models.voter import Voter, Class
from app.models.election import (
    Election, ElectionStatus, ElectionEligibleClass,
    Post, Candidate, VoterParticipation, Ballot, BallotSelection,
)
from app.models.audit_log import AuditLog
from app.dependencies import get_current_admin
from app.schemas.schemas import (
    ElectionCreate, ElectionUpdate, ElectionStatusUpdate, ElectionResponse,
    PostCreate, PostUpdate, PostResponse,
    CandidateCreate, CandidateUpdate, CandidateResponse,
    ElectionResult, PostResult,
)

router = APIRouter(prefix="/admin/elections", tags=["Elections"])


# ---- Election CRUD ----

@router.get("/", response_model=list[ElectionResponse])
async def list_elections(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all elections."""
    result = await db.execute(select(Election).order_by(Election.created_at.desc()))
    elections = result.scalars().all()

    response = []
    for election in elections:
        eligible_classes = []
        for ec in election.eligible_classes:
            if ec.class_rel:
                eligible_classes.append({
                    "id": ec.class_rel.id,
                    "name": ec.class_rel.name,
                })

        # Count eligible voters
        class_ids = [ec.class_id for ec in election.eligible_classes]
        if class_ids:
            voter_count_result = await db.execute(
                select(func.count(Voter.id)).where(
                    Voter.class_id.in_(class_ids),
                    Voter.is_active == True,
                )
            )
        else:
            voter_count_result = await db.execute(
                select(func.count(Voter.id)).where(Voter.is_active == True)
            )
        total_eligible = voter_count_result.scalar() or 0

        # Count votes cast
        participation_result = await db.execute(
            select(func.count(VoterParticipation.id)).where(
                VoterParticipation.election_id == election.id
            )
        )
        votes_cast = participation_result.scalar() or 0

        el_status = election.status.value if hasattr(election.status, 'value') else election.status

        response.append(ElectionResponse(
            id=election.id,
            name=election.name,
            description=election.description,
            status=el_status,
            start_time=election.start_time,
            end_time=election.end_time,
            created_at=election.created_at,
            eligible_classes=eligible_classes,
            total_eligible_voters=total_eligible,
            votes_cast=votes_cast,
        ))

    return response


@router.post("/", response_model=ElectionResponse, status_code=status.HTTP_201_CREATED)
async def create_election(
    data: ElectionCreate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new election."""
    election = Election(
        name=data.name,
        description=data.description,
        status=ElectionStatus.DRAFT,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(election)
    await db.flush()

    # Add eligible classes
    for class_id in data.eligible_class_ids:
        ec = ElectionEligibleClass(
            election_id=election.id,
            class_id=class_id,
        )
        db.add(ec)

    audit = AuditLog(
        action="election_created",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Created election: {data.name}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(election)

    eligible_classes = []
    for ec in election.eligible_classes:
        if ec.class_rel:
            eligible_classes.append({
                "id": ec.class_rel.id,
                "name": ec.class_rel.name,
            })

    return ElectionResponse(
        id=election.id,
        name=election.name,
        description=election.description,
        status=election.status.value if hasattr(election.status, 'value') else election.status,
        start_time=election.start_time,
        end_time=election.end_time,
        created_at=election.created_at,
        eligible_classes=eligible_classes,
        total_eligible_voters=0,
        votes_cast=0,
    )


@router.get("/{election_id}", response_model=ElectionResponse)
async def get_election(
    election_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get election details."""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    eligible_classes = []
    for ec in election.eligible_classes:
        if ec.class_rel:
            eligible_classes.append({
                "id": ec.class_rel.id,
                "name": ec.class_rel.name,
            })

    class_ids = [ec.class_id for ec in election.eligible_classes]
    if class_ids:
        voter_count_result = await db.execute(
            select(func.count(Voter.id)).where(
                Voter.class_id.in_(class_ids),
                Voter.is_active == True,
            )
        )
    else:
        voter_count_result = await db.execute(
            select(func.count(Voter.id)).where(Voter.is_active == True)
        )
    total_eligible = voter_count_result.scalar() or 0

    participation_result = await db.execute(
        select(func.count(VoterParticipation.id)).where(
            VoterParticipation.election_id == election.id
        )
    )
    votes_cast = participation_result.scalar() or 0

    return ElectionResponse(
        id=election.id,
        name=election.name,
        description=election.description,
        status=election.status.value if hasattr(election.status, 'value') else election.status,
        start_time=election.start_time,
        end_time=election.end_time,
        created_at=election.created_at,
        eligible_classes=eligible_classes,
        total_eligible_voters=total_eligible,
        votes_cast=votes_cast,
    )


@router.put("/{election_id}", response_model=ElectionResponse)
async def update_election(
    election_id: int,
    data: ElectionUpdate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an election (only in DRAFT or SCHEDULED state)."""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status not in ("DRAFT", "SCHEDULED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only edit elections in DRAFT or SCHEDULED state",
        )

    if data.name is not None:
        election.name = data.name
    if data.description is not None:
        election.description = data.description
    if data.start_time is not None:
        election.start_time = data.start_time
    if data.end_time is not None:
        election.end_time = data.end_time

    if data.eligible_class_ids is not None:
        # Remove existing
        for ec in election.eligible_classes:
            await db.delete(ec)
        await db.flush()
        # Add new
        for class_id in data.eligible_class_ids:
            ec = ElectionEligibleClass(
                election_id=election.id,
                class_id=class_id,
            )
            db.add(ec)

    await db.commit()
    await db.refresh(election)

    eligible_classes = []
    for ec in election.eligible_classes:
        if ec.class_rel:
            eligible_classes.append({
                "id": ec.class_rel.id,
                "name": ec.class_rel.name,
            })

    return ElectionResponse(
        id=election.id,
        name=election.name,
        description=election.description,
        status=election.status.value if hasattr(election.status, 'value') else election.status,
        start_time=election.start_time,
        end_time=election.end_time,
        created_at=election.created_at,
        eligible_classes=eligible_classes,
        total_eligible_voters=0,
        votes_cast=0,
    )


@router.put("/{election_id}/status")
async def update_election_status(
    election_id: int,
    data: ElectionStatusUpdate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update election status with validation."""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    current_status = election.status.value if hasattr(election.status, 'value') else election.status
    new_status = data.status

    # Validate status transitions
    valid_transitions = {
        "DRAFT": ["SCHEDULED", "OPEN"],
        "SCHEDULED": ["OPEN", "DRAFT"],
        "OPEN": ["PAUSED", "CLOSED"],
        "PAUSED": ["OPEN", "CLOSED"],
        "CLOSED": [],
    }

    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {current_status} to {new_status}",
        )

    # Validate election has posts and candidates before opening
    if new_status == "OPEN":
        posts_result = await db.execute(
            select(Post).where(Post.election_id == election_id)
        )
        posts = posts_result.scalars().all()
        if not posts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Election must have at least one post before opening",
            )
        for post in posts:
            if not post.candidates:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Post '{post.title}' has no candidates",
                )

    election.status = ElectionStatus(new_status)

    audit = AuditLog(
        action=f"election_{new_status.lower()}",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Election '{election.name}' status changed: {current_status} → {new_status}",
    )
    db.add(audit)

    await db.commit()

    return {"status": new_status}


# ---- Posts CRUD ----

@router.get("/{election_id}/posts", response_model=list[PostResponse])
async def list_posts(
    election_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all posts for an election."""
    result = await db.execute(
        select(Post).where(Post.election_id == election_id).order_by(Post.display_order)
    )
    posts = result.scalars().all()

    response = []
    for post in posts:
        candidates = [{
            "id": c.id,
            "name": c.name,
            "usn": c.usn,
            "class_name": c.class_name,
            "photo_url": c.photo_url,
            "description": c.description,
            "display_order": c.display_order,
        } for c in sorted(post.candidates, key=lambda x: x.display_order)]

        response.append(PostResponse(
            id=post.id,
            election_id=post.election_id,
            title=post.title,
            description=post.description,
            is_mandatory=post.is_mandatory,
            display_order=post.display_order,
            candidates=candidates,
        ))

    return response


@router.post("/{election_id}/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    election_id: int,
    data: PostCreate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new post for an election."""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status not in ("DRAFT", "SCHEDULED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add posts after election has started",
        )

    post = Post(
        election_id=election_id,
        title=data.title,
        description=data.description,
        is_mandatory=data.is_mandatory,
        display_order=data.display_order,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return PostResponse(
        id=post.id,
        election_id=post.election_id,
        title=post.title,
        description=post.description,
        is_mandatory=post.is_mandatory,
        display_order=post.display_order,
        candidates=[],
    )


@router.put("/{election_id}/posts/{post_id}", response_model=PostResponse)
async def update_post(
    election_id: int,
    post_id: int,
    data: PostUpdate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a post."""
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.election_id == election_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if data.title is not None:
        post.title = data.title
    if data.description is not None:
        post.description = data.description
    if data.is_mandatory is not None:
        post.is_mandatory = data.is_mandatory
    if data.display_order is not None:
        post.display_order = data.display_order

    await db.commit()
    await db.refresh(post)

    candidates = [{
        "id": c.id,
        "name": c.name,
        "usn": c.usn,
        "class_name": c.class_name,
        "photo_url": c.photo_url,
        "description": c.description,
        "display_order": c.display_order,
    } for c in sorted(post.candidates, key=lambda x: x.display_order)]

    return PostResponse(
        id=post.id,
        election_id=post.election_id,
        title=post.title,
        description=post.description,
        is_mandatory=post.is_mandatory,
        display_order=post.display_order,
        candidates=candidates,
    )


@router.delete("/{election_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    election_id: int,
    post_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a post."""
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.election_id == election_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Check election status
    election_result = await db.execute(select(Election).where(Election.id == election_id))
    election = election_result.scalar_one_or_none()
    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status not in ("DRAFT", "SCHEDULED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete posts after election has started",
        )

    await db.delete(post)
    await db.commit()


# ---- Candidates CRUD ----

@router.post("/{election_id}/posts/{post_id}/candidates", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    election_id: int,
    post_id: int,
    data: CandidateCreate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add a candidate to a post."""
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.election_id == election_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Check election status
    election_result = await db.execute(select(Election).where(Election.id == election_id))
    election = election_result.scalar_one_or_none()
    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status not in ("DRAFT", "SCHEDULED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add candidates after election has started",
        )

    candidate = Candidate(
        post_id=post_id,
        name=data.name,
        usn=data.usn,
        class_name=data.class_name,
        photo_url=data.photo_url,
        description=data.description,
        display_order=data.display_order,
    )
    db.add(candidate)

    audit = AuditLog(
        action="candidate_added",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Added candidate '{data.name}' to post '{post.title}'",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(candidate)

    return CandidateResponse(
        id=candidate.id,
        post_id=candidate.post_id,
        name=candidate.name,
        usn=candidate.usn,
        class_name=candidate.class_name,
        photo_url=candidate.photo_url,
        description=candidate.description,
        display_order=candidate.display_order,
    )


@router.put("/{election_id}/posts/{post_id}/candidates/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    election_id: int,
    post_id: int,
    candidate_id: int,
    data: CandidateUpdate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a candidate."""
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.post_id == post_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if data.name is not None:
        candidate.name = data.name
    if data.usn is not None:
        candidate.usn = data.usn
    if data.class_name is not None:
        candidate.class_name = data.class_name
    if data.photo_url is not None:
        candidate.photo_url = data.photo_url
    if data.description is not None:
        candidate.description = data.description
    if data.display_order is not None:
        candidate.display_order = data.display_order

    await db.commit()
    await db.refresh(candidate)

    return CandidateResponse(
        id=candidate.id,
        post_id=candidate.post_id,
        name=candidate.name,
        usn=candidate.usn,
        class_name=candidate.class_name,
        photo_url=candidate.photo_url,
        description=candidate.description,
        display_order=candidate.display_order,
    )


@router.delete("/{election_id}/posts/{post_id}/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    election_id: int,
    post_id: int,
    candidate_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a candidate."""
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.post_id == post_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Check election status
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    election_result = await db.execute(select(Election).where(Election.id == post.election_id))
    election = election_result.scalar_one_or_none()
    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status not in ("DRAFT", "SCHEDULED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove candidates after election has started",
        )

    audit = AuditLog(
        action="candidate_removed",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Removed candidate '{candidate.name}' from post '{post.title}'",
    )
    db.add(audit)

    await db.delete(candidate)
    await db.commit()


# ---- Results ----

@router.get("/{election_id}/results", response_model=ElectionResult)
async def get_election_results(
    election_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get election results (only after election is closed)."""
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status != "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Results are only available after the election is closed",
        )

    # Log results view
    audit = AuditLog(
        action="results_viewed",
        actor_type="admin",
        actor_id=admin.id,
        actor_name=admin.username,
        details=f"Viewed results for election: {election.name}",
    )
    db.add(audit)
    await db.commit()

    # Get posts and count votes
    posts_result = await db.execute(
        select(Post).where(Post.election_id == election_id).order_by(Post.display_order)
    )
    posts = posts_result.scalars().all()

    post_results = []
    for post in posts:
        candidates_data = []
        total_votes_for_post = 0

        for candidate in sorted(post.candidates, key=lambda x: x.display_order):
            vote_count_result = await db.execute(
                select(func.count(BallotSelection.id)).where(
                    BallotSelection.candidate_id == candidate.id,
                    BallotSelection.post_id == post.id,
                )
            )
            vote_count = vote_count_result.scalar() or 0
            total_votes_for_post += vote_count

            candidates_data.append({
                "id": candidate.id,
                "name": candidate.name,
                "usn": candidate.usn,
                "class_name": candidate.class_name,
                "votes": vote_count,
                "percentage": 0,  # Will calculate below
            })

        # Calculate percentages
        for cd in candidates_data:
            if total_votes_for_post > 0:
                cd["percentage"] = round(cd["votes"] / total_votes_for_post * 100, 2)

        # Sort by votes descending
        candidates_data.sort(key=lambda x: x["votes"], reverse=True)

        post_results.append(PostResult(
            post_id=post.id,
            post_title=post.title,
            candidates=candidates_data,
            total_votes=total_votes_for_post,
        ))

    # Turnout
    class_ids = [ec.class_id for ec in election.eligible_classes]
    if class_ids:
        total_eligible_result = await db.execute(
            select(func.count(Voter.id)).where(
                Voter.class_id.in_(class_ids),
                Voter.is_active == True,
            )
        )
    else:
        total_eligible_result = await db.execute(
            select(func.count(Voter.id)).where(Voter.is_active == True)
        )
    total_eligible = total_eligible_result.scalar() or 0

    participation_result = await db.execute(
        select(func.count(VoterParticipation.id)).where(
            VoterParticipation.election_id == election_id
        )
    )
    votes_cast = participation_result.scalar() or 0

    turnout = {
        "total_eligible": total_eligible,
        "votes_cast": votes_cast,
        "not_voted": total_eligible - votes_cast,
        "percentage": round(votes_cast / total_eligible * 100, 2) if total_eligible > 0 else 0,
    }

    # Class-wise turnout
    class_turnout = []
    classes_result = await db.execute(select(Class))
    all_classes = classes_result.scalars().all()

    for cls in all_classes:
        cls_total_result = await db.execute(
            select(func.count(Voter.id)).where(
                Voter.class_id == cls.id,
                Voter.is_active == True,
            )
        )
        cls_total = cls_total_result.scalar() or 0

        cls_voted_result = await db.execute(
            select(func.count(VoterParticipation.id))
            .select_from(VoterParticipation)
            .join(Voter, Voter.id == VoterParticipation.voter_id)
            .where(
                VoterParticipation.election_id == election_id,
                Voter.class_id == cls.id,
            )
        )
        cls_voted = cls_voted_result.scalar() or 0

        if cls_total > 0:
            class_turnout.append({
                "class_id": cls.id,
                "class_name": cls.name,
                "total": cls_total,
                "voted": cls_voted,
                "turnout": round(cls_voted / cls_total * 100, 2),
            })

    return ElectionResult(
        election={
            "id": election.id,
            "name": election.name,
            "status": el_status,
        },
        posts=post_results,
        turnout=turnout,
        class_turnout=class_turnout,
    )


# ---- Voting Activity ----

@router.get("/{election_id}/activity")
async def get_voting_activity(
    election_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time voting activity for an election."""
    # Get participation records (without ballot details for privacy)
    result = await db.execute(
        select(VoterParticipation)
        .where(VoterParticipation.election_id == election_id)
        .order_by(VoterParticipation.voted_at.desc())
        .limit(100)
    )
    participations = result.scalars().all()

    activity = []
    for p in participations:
        voter_result = await db.execute(select(Voter).where(Voter.id == p.voter_id))
        voter = voter_result.scalar_one_or_none()
        if voter:
            activity.append({
                "voter_usn": voter.usn,
                "voter_name": voter.name or "N/A",
                "class_name": voter.class_rel.name if voter.class_rel else "N/A",
                "voted_at": p.voted_at.isoformat(),
            })

    return {"activity": activity}
