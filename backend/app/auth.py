"""
JWT authentication dependency for FastAPI.

In demo_mode: auth is bypassed entirely — a fake super_admin user is returned.
In production: verifies Supabase HS256 JWTs and looks up the user's role.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.schemas.users import CurrentUser

# ── Demo mode fake user ───────────────────────────────────────────────────────

_DEMO_USER = CurrentUser(
    id="00000000-0000-0000-0000-000000000000",
    email="admin@hiremind.test",
    name="Demo Admin",
    role="super_admin",
    token="demo-token",
)


if settings.demo_mode:
    # Skip all token verification — always return the demo user
    async def get_current_user() -> CurrentUser:
        return _DEMO_USER

    def require_role(*allowed_roles: str):
        async def _check() -> CurrentUser:
            return _DEMO_USER
        return _check

else:
    # ── Production JWT verification ──────────────────────────────────────────
    from jose import JWTError, jwt
    from app.database import supabase

    _bearer = HTTPBearer(auto_error=True)
    _JWT_ALGORITHM = "HS256"

    async def get_current_user(
        credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    ) -> CurrentUser:
        token = credentials.credentials
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

    def require_role(*allowed_roles: str):
        async def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access restricted. Required role(s): {', '.join(allowed_roles)}.",
                )
            return user
        return _check
