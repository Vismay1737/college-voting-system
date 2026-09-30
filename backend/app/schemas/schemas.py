from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ---- Auth Schemas ----
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class VoterLoginRequest(BaseModel):
    usn: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    user_name: Optional[str] = None
    user_id: int


# ---- Class Schemas ----
class ClassCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class ClassResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    student_count: int = 0
    voted_count: int = 0

    class Config:
        from_attributes = True


# ---- Voter Schemas ----
class VoterResponse(BaseModel):
    id: int
    usn: str
    name: Optional[str]
    class_id: Optional[int]
    class_name: Optional[str] = None
    is_active: bool
    has_voted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VoterCredential(BaseModel):
    usn: str
    name: Optional[str]
    class_name: Optional[str]
    password: str  # Plaintext - only used in import response


class ImportPreviewResponse(BaseModel):
    headers: List[str]
    detected_mapping: dict
    sample_rows: List[dict]
    total_rows: int


class ColumnMapping(BaseModel):
    usn_column: str
    name_column: Optional[str] = None
    class_column: Optional[str] = None


class ImportValidationResponse(BaseModel):
    valid: List[dict]
    duplicates: List[dict]
    invalid: List[dict]
    existing: List[dict]
    summary: dict


class ImportConfirmRequest(BaseModel):
    usn_column: str
    name_column: Optional[str] = None
    class_column: Optional[str] = None


class ImportResultResponse(BaseModel):
    imported_count: int
    credentials: List[VoterCredential]
    errors: List[dict]


class PasswordResetResponse(BaseModel):
    usn: str
    new_password: str


# ---- Election Schemas ----
class ElectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    eligible_class_ids: List[int] = []


class ElectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    eligible_class_ids: Optional[List[int]] = None


class ElectionStatusUpdate(BaseModel):
    status: str


class ElectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    created_at: datetime
    eligible_classes: List[dict] = []
    total_eligible_voters: int = 0
    votes_cast: int = 0

    class Config:
        from_attributes = True


# ---- Post Schemas ----
class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    is_mandatory: bool = True
    display_order: int = 0


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_mandatory: Optional[bool] = None
    display_order: Optional[int] = None


class PostResponse(BaseModel):
    id: int
    election_id: int
    title: str
    description: Optional[str]
    is_mandatory: bool
    display_order: int
    candidates: List[dict] = []

    class Config:
        from_attributes = True


# ---- Candidate Schemas ----
class CandidateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    usn: Optional[str] = None
    class_name: Optional[str] = None
    photo_url: Optional[str] = None
    description: Optional[str] = None
    display_order: int = 0


class CandidateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    usn: Optional[str] = None
    class_name: Optional[str] = None
    photo_url: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None


class CandidateResponse(BaseModel):
    id: int
    post_id: int
    name: str
    usn: Optional[str]
    class_name: Optional[str]
    photo_url: Optional[str]
    description: Optional[str]
    display_order: int

    class Config:
        from_attributes = True


# ---- Voting Schemas ----
class VoteSelection(BaseModel):
    post_id: int
    candidate_id: int


class VoteSubmission(BaseModel):
    election_id: int
    selections: List[VoteSelection]


class VoterDashboardResponse(BaseModel):
    voter: dict
    election: Optional[dict] = None
    has_voted: bool = False


# ---- Results Schemas ----
class PostResult(BaseModel):
    post_id: int
    post_title: str
    candidates: List[dict]
    total_votes: int


class ElectionResult(BaseModel):
    election: dict
    posts: List[PostResult]
    turnout: dict
    class_turnout: List[dict]


# ---- Audit Schemas ----
class AuditLogResponse(BaseModel):
    id: int
    action: str
    actor_type: str
    actor_name: Optional[str]
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Dashboard Schemas ----
class DashboardStats(BaseModel):
    total_students: int
    class_stats: List[dict]
    registered_voters: int
    votes_cast: int
    remaining_voters: int
    turnout_percentage: float
    election_status: Optional[str] = None
    active_election: Optional[dict] = None
