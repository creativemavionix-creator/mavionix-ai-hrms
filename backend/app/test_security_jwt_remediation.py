"""
Automated regression test suite verifying remediation of JWT authentication bypass.

Guarantees:
1. Forged, signed-with-wrong-key, or unverified JWTs are rejected with HTTP 401.
2. Forged super-admin UUID tokens are rejected with HTTP 401.
3. Malformed and expired tokens are rejected with HTTP 401.
4. Supabase API/network failures fail closed with HTTP 401 (no unverified JWT fallback).
5. Cryptographically verified Supabase tokens successfully authenticate.
"""
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
import jwt

from app.auth import _verify_bearer_credentials
from app.config import settings
from app.schemas.users import CurrentUser


@pytest.fixture(autouse=True)
def disable_demo_mode_env():
    """Ensure tests run under production environment settings where demo mode is inactive."""
    orig_env = settings.app_env
    orig_demo = settings.demo_mode
    settings.app_env = "production"
    settings.demo_mode = False
    try:
        yield
    finally:
        settings.app_env = orig_env
        settings.demo_mode = orig_demo


@pytest.mark.anyio
async def test_a_forged_jwt_with_user_uuid():
    """Test A — Forged JWT signed with attacker key must return HTTP 401."""
    attacker_secret = "attacker_secret_key_12345"
    forged_token = jwt.encode(
        {"sub": "11111111-1111-1111-1111-111111111111", "role": "recruiter"},
        attacker_secret,
        algorithm="HS256",
    )

    with patch("app.auth.supabase.auth.get_user", side_effect=Exception("Invalid signature")):
        with pytest.raises(HTTPException) as exc_info:
            await _verify_bearer_credentials(forged_token)

        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail


@pytest.mark.anyio
async def test_b_forged_super_admin_jwt():
    """Test B — Forged super_admin UUID token must return HTTP 401."""
    attacker_secret = "attacker_secret_key_12345"
    forged_admin_token = jwt.encode(
        {"sub": "00000000-0000-0000-0000-000000000000", "role": "super_admin"},
        attacker_secret,
        algorithm="HS256",
    )

    with patch("app.auth.supabase.auth.get_user", side_effect=Exception("Invalid JWT signature")):
        with pytest.raises(HTTPException) as exc_info:
            await _verify_bearer_credentials(forged_admin_token)

        assert exc_info.value.status_code == 401


@pytest.mark.anyio
async def test_c_malformed_jwt():
    """Test C — Malformed JWT token string must return HTTP 401."""
    malformed_token = "invalid.token.format"

    with patch("app.auth.supabase.auth.get_user", side_effect=Exception("Malformed token")):
        with pytest.raises(HTTPException) as exc_info:
            await _verify_bearer_credentials(malformed_token)

        assert exc_info.value.status_code == 401


@pytest.mark.anyio
async def test_d_expired_jwt():
    """Test D — Expired JWT token must return HTTP 401."""
    expired_token = jwt.encode(
        {"sub": "22222222-2222-2222-2222-222222222222", "exp": 1000000000},
        "some_secret",
        algorithm="HS256",
    )

    with patch("app.auth.supabase.auth.get_user", side_effect=Exception("JWT expired")):
        with pytest.raises(HTTPException) as exc_info:
            await _verify_bearer_credentials(expired_token)

        assert exc_info.value.status_code == 401


@pytest.mark.anyio
async def test_e_supabase_verification_failure_fails_closed():
    """Test E — Network or API failure in Supabase auth.get_user() fails closed with 401."""
    token = "some_valid_looking_token_string"

    # Simulate network outage or Supabase auth endpoint 503
    with patch("app.auth.supabase.auth.get_user", side_effect=RuntimeError("Supabase service unreachable")):
        with pytest.raises(HTTPException) as exc_info:
            await _verify_bearer_credentials(token)

        assert exc_info.value.status_code == 401
        assert "Could not validate credentials" in exc_info.value.detail


@pytest.mark.anyio
async def test_f_valid_supabase_token_authenticates():
    """Test F — Cryptographically valid Supabase token authenticates normally."""
    valid_token = "valid_supabase_session_jwt"
    valid_uuid = "33333333-3333-3333-3333-333333333333"

    mock_auth_res = MagicMock()
    mock_auth_res.user.id = valid_uuid
    mock_auth_res.user.email = "recruiter@hiremind.ai"

    mock_db_res = MagicMock()
    mock_db_res.data = {
        "id": valid_uuid,
        "email": "recruiter@hiremind.ai",
        "name": "Sarah Recruiter",
        "role": "recruiter",
    }

    mock_table = MagicMock()
    mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = mock_db_res

    with patch("app.auth.supabase.auth.get_user", return_value=mock_auth_res), \
         patch("app.auth.supabase.table", return_value=mock_table):

        user: CurrentUser = await _verify_bearer_credentials(valid_token)

        assert isinstance(user, CurrentUser)
        assert user.id == valid_uuid
        assert user.email == "recruiter@hiremind.ai"
        assert user.name == "Sarah Recruiter"
        assert user.role == "recruiter"
        assert user.token == valid_token
