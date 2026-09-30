import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text,
    Enum as SAEnum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ElectionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    OPEN = "OPEN"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"


class Election(Base):
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SAEnum(ElectionStatus, name="election_status_enum", create_constraint=True),
        default=ElectionStatus.DRAFT,
        nullable=False,
    )
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    posts = relationship("Post", back_populates="election", lazy="selectin", cascade="all, delete-orphan")
    eligible_classes = relationship("ElectionEligibleClass", back_populates="election", lazy="selectin", cascade="all, delete-orphan")
    participations = relationship("VoterParticipation", back_populates="election", lazy="selectin")
    ballots = relationship("Ballot", back_populates="election", lazy="selectin")

    def __repr__(self):
        return f"<Election(id={self.id}, name='{self.name}', status='{self.status}')>"


class ElectionEligibleClass(Base):
    __tablename__ = "election_eligible_classes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    election_id = Column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)

    election = relationship("Election", back_populates="eligible_classes")
    class_rel = relationship("Class", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("election_id", "class_id", name="uq_election_class"),
    )


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    election_id = Column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    election = relationship("Election", back_populates="posts")
    candidates = relationship("Candidate", back_populates="post", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Post(id={self.id}, title='{self.title}')>"


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    usn = Column(String(50), nullable=True)
    class_name = Column(String(100), nullable=True)
    photo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    post = relationship("Post", back_populates="candidates")

    def __repr__(self):
        return f"<Candidate(id={self.id}, name='{self.name}')>"


class VoterParticipation(Base):
    """Records that a voter has participated in an election.
    Separated from ballot selections for secret ballot."""
    __tablename__ = "voter_participation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    election_id = Column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    voter_id = Column(Integer, ForeignKey("voters.id", ondelete="CASCADE"), nullable=False)
    voted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    ip_hash = Column(String(128), nullable=True)  # Hashed IP for audit

    election = relationship("Election", back_populates="participations")
    voter = relationship("Voter", back_populates="participations")

    __table_args__ = (
        UniqueConstraint("election_id", "voter_id", name="uq_election_voter_participation"),
    )


class Ballot(Base):
    """Anonymous ballot - no direct link to voter identity.
    Uses a random ballot_token instead of voter_id."""
    __tablename__ = "ballots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    election_id = Column(Integer, ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    ballot_token = Column(String(64), unique=True, nullable=False, index=True)
    cast_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    election = relationship("Election", back_populates="ballots")
    selections = relationship("BallotSelection", back_populates="ballot", lazy="selectin", cascade="all, delete-orphan")


class BallotSelection(Base):
    """Individual candidate selection within a ballot."""
    __tablename__ = "ballot_selections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ballot_id = Column(Integer, ForeignKey("ballots.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)

    ballot = relationship("Ballot", back_populates="selections")

    __table_args__ = (
        UniqueConstraint("ballot_id", "post_id", name="uq_ballot_post"),
    )
