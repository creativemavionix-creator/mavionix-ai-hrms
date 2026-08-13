"""
Candidate Portal Token Authentication Dependency.

Authenticates candidate-facing REST endpoints using candidate portal access tokens.
Validates HTTP Bearer headers:
    Authorization: Bearer <candidate_token>

Checks against the `candidate_tokens` table:
1. Extracts the Bearer token.
2. Looks up the token in candidate_tokens.
3. Rejects missing or nonexistent tokens with 401 Unauthorized.
4. Rejects missing, malformed, timezone-naive, or expired tokens (fails closed).
5. Rejects tokens if the associated interview round is already completed (fails closed on DB errors).
6. Returns a CandidateSession context object.
7. Provides helpers to enforce application-level and round-level scope isolation.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.database import supabase

_candidate_bearer = HTTPBearer(auto_error=True)


class CandidateSession(BaseModel):
    """Context object representing an authenticated candidate portal session."""
    token: str
    token_id: str
    candidate_id: str
    application_id: str
    round_type: str
    expires_at: str
    used: bool


async def get_current_candidate(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_candidate_bearer)],
) -> CandidateSession:
    """
    FastAPI dependency for authenticating candidate portal requests via candidate_tokens.
    Fails closed on missing tokens, DB errors, malformed timestamps, or completed rounds.
    """
    token = credentials.credentials
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or empty candidate authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Look up token in candidate_tokens table
    token_row = None
    try:
        token_result = (
            supabase.table("candidate_tokens")
            .select("*")
            .eq("token", token)
            .maybe_single()
            .execute()
        )
        if token_result and getattr(token_result, "data", None):
            token_row = token_result.data
    except Exception:
        token_row = None

    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate candidate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Expiration check (mandatory, timezone-aware, fail-closed validation)
    expires_at = token_row.get("expires_at")
    if not expires_at or not isinstance(expires_at, str) or not expires_at.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or null candidate token expiration timestamp.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid candidate token expiration timestamp format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if exp_dt.tzinfo is None or exp_dt.tzinfo.utcoffset(exp_dt) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Candidate token expiration timestamp must be timezone-aware.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if exp_dt < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Candidate access token has expired.",
        )

    # 3. Completion check: if token was used AND the associated round is completed, reject.
    # Fails closed on database/query exception.
    if token_row.get("used"):
        try:
            round_result = (
                supabase.table("ai_interview_rounds")
                .select("status")
                .eq("application_id", token_row["application_id"])
                .eq("round_type", token_row["round_type"])
                .maybe_single()
                .execute()
            )
            if (
                round_result
                and getattr(round_result, "data", None)
                and round_result.data.get("status") == "completed"
            ):
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail="This interview round has already been completed.",
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to verify candidate round authorization status.",
            )

    return CandidateSession(
        token=token,
        token_id=str(token_row.get("id", "")),
        candidate_id=str(token_row.get("candidate_id", "")),
        application_id=str(token_row.get("application_id", "")),
        round_type=str(token_row.get("round_type", "")),
        expires_at=str(expires_at),
        used=bool(token_row.get("used", False)),
    )


def require_candidate_application(target_application_id: str, candidate: CandidateSession) -> None:
    """
    Enforces application-level scope isolation: ensures that a candidate token for Application A
    cannot access or modify resources belonging to Application B.
    """
    if candidate.application_id != target_application_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate token is not authorized for the specified application.",
        )


def require_candidate_round_type(target_round_type: str, candidate: CandidateSession) -> None:
    """
    Enforces round-level scope isolation: ensures that a candidate token for 'tech'
    cannot access or modify an 'interview' or 'hr' round.
    """
    if candidate.round_type != target_round_type:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Candidate token for round type '{candidate.round_type}' is not authorized for round type '{target_round_type}'.",
        )
