import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from argon2 import PasswordHasher, Type
from argon2.exceptions import VerifyMismatchError
from jose import jwt, JWTError

from app.config import get_settings

settings = get_settings()

# Argon2id hasher with secure defaults
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,  # argon2id
)


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return ph.verify(password_hash, password)
    except Exception:
        return False


def generate_voter_password() -> str:
    """Generate a cryptographically secure random password for a voter.
    Format: XXXX-XXXX-XX (alphanumeric, no ambiguous chars)
    """
    # Use unambiguous characters
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    part1 = ''.join(secrets.choice(alphabet) for _ in range(4))
    part2 = ''.join(secrets.choice(alphabet) for _ in range(4))
    part3 = ''.join(secrets.choice(alphabet) for _ in range(2))
    return f"{part1}-{part2}-{part3}"


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    token_type: str = "admin",
) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "type": token_type,
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def hash_ip(ip_address: str) -> str:
    """Hash an IP address for audit logging (non-reversible)."""
    return hashlib.sha256(
        f"{settings.SECRET_KEY}:{ip_address}".encode()
    ).hexdigest()[:32]


def generate_ballot_token() -> str:
    """Generate a unique random token for an anonymous ballot."""
    return secrets.token_hex(32)
