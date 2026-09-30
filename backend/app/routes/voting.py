from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.voter import Voter
from app.models.election import (
    Election, ElectionStatus, ElectionEligibleClass,
    Post, Candidate, VoterParticipation, Ballot, BallotSelection,
)
from app.models.audit_log import AuditLog
from app.dependencies import get_current_voter
from app.schemas.schemas import VoteSubmission, VoterDashboardResponse
from app.utils.security import hash_ip, generate_ballot_token

router = APIRouter(prefix="/voter", tags=["Voter"])


@router.get("/dashboard", response_model=VoterDashboardResponse)
async def voter_dashboard(
    voter: Voter = Depends(get_current_voter),
    db: AsyncSession = Depends(get_db),
):
    """Get voter dashboard with election info and voting status."""
    voter_data = {
        "id": voter.id,
        "usn": voter.usn,
        "name": voter.name or voter.usn,
        "class_name": voter.class_rel.name if voter.class_rel else None,
    }

    # Find an open or eligible election
    # First, get elections where voter's class is eligible
    if voter.class_id:
        eligible_election_ids_result = await db.execute(
            select(ElectionEligibleClass.election_id).where(
                ElectionEligibleClass.class_id == voter.class_id
            )
        )
        eligible_ids = [row[0] for row in eligible_election_ids_result.all()]

        # Also check elections with no class restriction
        all_elections_result = await db.execute(
            select(Election).where(
                Election.status == ElectionStatus.OPEN
            )
        )
        all_open = all_elections_result.scalars().all()

        election = None
        for e in all_open:
            if not e.eligible_classes or e.id in eligible_ids:
                election = e
                break
    else:
        # No class assigned - find any open election
        result = await db.execute(
            select(Election).where(Election.status == ElectionStatus.OPEN).limit(1)
        )
        election = result.scalar_one_or_none()

    election_data = None
    has_voted = False

    if election:
        # Check if voter has already voted
        participation_result = await db.execute(
            select(VoterParticipation).where(
                VoterParticipation.election_id == election.id,
                VoterParticipation.voter_id == voter.id,
            )
        )
        participation = participation_result.scalar_one_or_none()
        has_voted = participation is not None

        election_data = {
            "id": election.id,
            "name": election.name,
            "description": election.description,
            "status": election.status.value if hasattr(election.status, 'value') else election.status,
        }

    return VoterDashboardResponse(
        voter=voter_data,
        election=election_data,
        has_voted=has_voted,
    )


@router.get("/election/{election_id}/ballot")
async def get_ballot(
    election_id: int,
    voter: Voter = Depends(get_current_voter),
    db: AsyncSession = Depends(get_db),
):
    """Get the ballot (posts and candidates) for an election."""
    # Verify election is open
    result = await db.execute(select(Election).where(Election.id == election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This election is not currently open for voting",
        )

    # Verify voter eligibility
    if voter.class_id and election.eligible_classes:
        eligible_class_ids = [ec.class_id for ec in election.eligible_classes]
        if voter.class_id not in eligible_class_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not eligible to vote in this election",
            )

    # Check if already voted
    participation_result = await db.execute(
        select(VoterParticipation).where(
            VoterParticipation.election_id == election_id,
            VoterParticipation.voter_id == voter.id,
        )
    )
    if participation_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already voted in this election",
        )

    # Get posts and candidates
    posts_result = await db.execute(
        select(Post).where(Post.election_id == election_id).order_by(Post.display_order)
    )
    posts = posts_result.scalars().all()

    ballot_data = []
    for post in posts:
        candidates = [{
            "id": c.id,
            "name": c.name,
            "usn": c.usn,
            "class_name": c.class_name,
            "photo_url": c.photo_url,
            "description": c.description,
        } for c in sorted(post.candidates, key=lambda x: x.display_order)]

        ballot_data.append({
            "id": post.id,
            "title": post.title,
            "description": post.description,
            "is_mandatory": post.is_mandatory,
            "candidates": candidates,
        })

    return {
        "election": {
            "id": election.id,
            "name": election.name,
        },
        "posts": ballot_data,
    }


@router.post("/vote")
async def submit_vote(
    request: Request,
    vote_data: VoteSubmission,
    voter: Voter = Depends(get_current_voter),
    db: AsyncSession = Depends(get_db),
):
    """Submit a vote. Uses atomic transaction with database-level uniqueness."""
    # Verify election is open
    result = await db.execute(select(Election).where(Election.id == vote_data.election_id))
    election = result.scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    el_status = election.status.value if hasattr(election.status, 'value') else election.status
    if el_status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This election is not currently open for voting",
        )

    # Verify voter is active
    if not voter.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled",
        )

    # Verify voter eligibility
    if voter.class_id and election.eligible_classes:
        eligible_class_ids = [ec.class_id for ec in election.eligible_classes]
        if voter.class_id not in eligible_class_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not eligible to vote in this election",
            )

    # Validate selections
    posts_result = await db.execute(
        select(Post).where(Post.election_id == vote_data.election_id)
    )
    posts = posts_result.scalars().all()
    post_map = {p.id: p for p in posts}

    # Check all mandatory posts are selected
    mandatory_post_ids = {p.id for p in posts if p.is_mandatory}
    selected_post_ids = {s.post_id for s in vote_data.selections}

    missing_mandatory = mandatory_post_ids - selected_post_ids
    if missing_mandatory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All mandatory posts must have a selection",
        )

    # Validate each selection
    for selection in vote_data.selections:
        post = post_map.get(selection.post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid post ID: {selection.post_id}",
            )

        candidate_ids = {c.id for c in post.candidates}
        if selection.candidate_id not in candidate_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid candidate for post '{post.title}'",
            )

    # ATOMIC TRANSACTION: Record participation and ballot
    try:
        # 1. Record participation (linked to voter identity)
        ip = request.client.host if request.client else "unknown"
        participation = VoterParticipation(
            election_id=vote_data.election_id,
            voter_id=voter.id,
            ip_hash=hash_ip(ip),
        )
        db.add(participation)

        # 2. Create anonymous ballot (NOT linked to voter)
        ballot_token = generate_ballot_token()
        ballot = Ballot(
            election_id=vote_data.election_id,
            ballot_token=ballot_token,
        )
        db.add(ballot)
        await db.flush()

        # 3. Add ballot selections
        for selection in vote_data.selections:
            bs = BallotSelection(
                ballot_id=ballot.id,
                post_id=selection.post_id,
                candidate_id=selection.candidate_id,
            )
            db.add(bs)

        # 4. Mark voter as has_voted
        voter.has_voted = True

        await db.commit()

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already voted in this election. Duplicate vote rejected.",
        )

    return {"message": "Vote submitted successfully", "status": "success"}
