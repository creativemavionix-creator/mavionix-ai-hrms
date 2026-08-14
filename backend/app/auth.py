"""
JWT authentication dependency for FastAPI.

In demo_mode: auth is bypassed entirely for standard HR routes — a fake super_admin user is returned.
In production: verifies Supabase HS256 JWTs and looks up the user's role.
"""
from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import supabase
from app.schemas.users import CurrentUser

# ── Service & Demo mode users ─────────────────────────────────────────────────

_DEMO_USER = CurrentUser(
    id="00000000-0000-0000-0000-000000000000",
    email="admin@hiremind.test",
    name="Demo Admin",
    role="super_admin",
    token="demo-token",
)

_SERVICE_USER = CurrentUser(
    id="00000000-0000-0000-0000-000000000001",
    email="service@hiremind.internal",
    name="Internal Service",
    role="super_admin",
    token="internal-service",
)

_bearer_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_optional)] = None,
) -> CurrentUser:
    """
    Get current authenticated user.
    In demo_mode: returns demo super_admin user unless specific credentials provided.
    In production: verifies Supabase HS256 JWT.
    """
    if settings.demo_mode:
        if credentials is not None and credentials.credentials and credentials.credentials != _DEMO_USER.token:
            return await _verify_bearer_credentials(credentials.credentials)
        return _DEMO_USER

    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _verify_bearer_credentials(credentials.credentials)


def require_role(*allowed_roles: str):
    async def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if settings.demo_mode and user == _DEMO_USER:
            return _DEMO_USER
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted. Required role(s): {', '.join(allowed_roles)}.",
            )
        return user
    return _check


async def require_internal_or_hr(
    x_internal_secret: Annotated[str | None, Header(alias="X-Internal-Secret")] = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_optional)] = None,
) -> CurrentUser:
    """
    Authorization dependency for internal processing endpoints (C-03).
    Allows access strictly via:
    1. Valid X-Internal-Secret header (matching settings.internal_service_secret).
       Fails closed if settings.internal_service_secret is blank or unconfigured.
    2. Valid HR staff Bearer credentials (role in super_admin, hr_manager, recruiter, interviewer).
       Rejects unauthenticated, arbitrary, malformed, or candidate Bearer tokens even in demo mode.
    """
    # 1. Check internal service secret header if provided
    if x_internal_secret is not None:
        configured_secret = settings.internal_service_secret
        if not configured_secret or not configured_secret.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Internal service secret authentication is not configured on this server.",
            )
        if secrets.compare_digest(x_internal_secret, configured_secret):
            return _SERVICE_USER
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service secret.",
        )

    # 2. Check Bearer token / HR staff auth if provided
    if credentials is not None and credentials.credentials:
        user = await _verify_bearer_credentials(credentials.credentials)
        if user.role in ("super_admin", "hr_manager", "recruiter", "interviewer"):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to HR staff.",
        )

    # 3. Unauthenticated / missing credentials -> reject
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Provide a valid Bearer token or X-Internal-Secret header.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _verify_bearer_credentials(token: str) -> CurrentUser:
    """Internal helper to verify JWT token or demo token."""
    if settings.demo_mode and token == _DEMO_USER.token:
        return _DEMO_USER

    from jose import JWTError, jwt

    _JWT_ALGORITHM = "HS256"
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[_JWT_ALGORITHM],
            options={"verify_aud": False},
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = None
    try:
        res = (
            supabase.table("users")
            .select("id, email, name, role")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        result = res.data if res else None
    except Exception:
        pass

    if not result:
        if settings.demo_mode:
            role = payload.get("role", "super_admin")
            return CurrentUser(
                id=user_id,
                email=payload.get("email", "demo@hiremind.test"),
                name=payload.get("name", "Demo User"),
                role=role,
                token=token,
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found. Contact your administrator.",
        )

    profile = result
    return CurrentUser(
        id=profile["id"],
        email=profile["email"],
        name=profile["name"],
        role=profile["role"],
        token=token,
    )
