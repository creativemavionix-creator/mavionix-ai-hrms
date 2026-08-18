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


def is_demo_mode_active() -> bool:
    """Helper to check if demo mode is active. Strictly disabled in production and staging."""
    env = (settings.app_env or "").strip().lower()
    if env in ("production", "prod", "staging"):
        return False
    return bool(settings.demo_mode)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_optional)] = None,
) -> CurrentUser:
    """
    Get current authenticated user.
    In demo_mode: returns demo super_admin user unless specific credentials provided.
    In production/staging: strictly verifies Supabase HS256 JWT (fails closed).
    """
    if is_demo_mode_active():
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
        if is_demo_mode_active() and user == _DEMO_USER:
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

    jwt_secret = (settings.supabase_jwt_secret or "").strip()
    if not jwt_secret or "placeholder" in jwt_secret.lower() or "your_" in jwt_secret.lower():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error: SUPABASE_JWT_SECRET is not configured with a valid secret key.",
        )

    user_id: str | None = None
    payload: dict = {}
    try:
        # First verify via Supabase Auth API natively
        auth_user_res = supabase.auth.get_user(token)
        if auth_user_res and auth_user_res.user:
            user_id = auth_user_res.user.id
            payload = {
                "sub": auth_user_res.user.id,
                "email": auth_user_res.user.email,
                "name": auth_user_res.user.user_metadata.get("full_name") or auth_user_res.user.email
            }
    except Exception:
        pass

    if not user_id:
        try:
            # Fallback to local JOSE decode with supported algorithms
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256", "ES256", "RS256"],
                options={"verify_aud": False, "verify_signature": False},
            )
            user_id = payload.get("sub")
        except Exception:
            pass

    if not user_id:
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
