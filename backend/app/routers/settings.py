"""
Settings router – /api/settings

GET  /api/settings                      list all key-value rows
GET  /api/settings/{key}                get one setting by key
PUT  /api/settings/{key}                upsert a setting (super_admin only)

Typed convenience endpoints (used by SettingsView sliders/toggles):
GET  /api/settings/scoring-weights      → AIWeights
PUT  /api/settings/scoring-weights      → AIWeights  (persists; also reloads resume_parser weights)
GET  /api/settings/notifications        → NotificationPrefs
PUT  /api/settings/notifications        → NotificationPrefs
GET  /api/settings/integrations         → Integrations
PUT  /api/settings/integrations         → Integrations

Known setting keys
------------------
  "ai_weights"          {"skills":40,"experience":30,"education":15,"projects":15}
  "notification_prefs"  {"email":true,"slack":true,"push":false,"ai_flag":true}
  "integrations"        {"linkedin":true,"naukri":true,"indeed":false,"slack":true,"email":true}
"""
from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_role
from app.database import get_user_client, supabase
from app.schemas.settings import (
    AIWeights,
    Integrations,
    NotificationPrefs,
    SettingRead,
    SettingUpdate,
    ShortlistThreshold,
)
from app.schemas.users import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["Settings"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
AdminDep       = Annotated[CurrentUser, Depends(require_role("super_admin", "hr_manager"))]
HRStaffDep     = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter", "interviewer"
))]

# ── Internal helper ───────────────────────────────────────────────────────────

def get_setting_value(key: str) -> Any:
    """
    Read a settings row by key using the service-role client.
    Returns the parsed JSON value, or None if the key does not exist.
    Used internally by resume_parser to load dynamic AI weights.
    """
    result = (
        supabase.table("settings").select("value").eq("key", key).maybe_single().execute()
    )
    return result.data["value"] if result.data else None


def _upsert(key: str, value: Any) -> dict:
    """Upsert a settings row by key (service-role, bypasses RLS)."""
    result = supabase.table("settings").upsert(
        {"key": key, "value": value},
        on_conflict="key",
    ).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail=f"Failed to upsert setting '{key}'.")
    return result.data[0]


# ── Generic routes ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[SettingRead])
async def list_settings(user: HRStaffDep):
    """Return all settings rows. Accessible by: all HR staff."""
    client = get_user_client(user.token)
    result = client.table("settings").select("*").order("key").execute()
    return result.data or []


@router.get("/{key}", response_model=SettingRead)
async def get_setting(key: str, user: HRStaffDep):
    """Fetch a single setting by its unique key."""
    client = get_user_client(user.token)
    result = (
        client.table("settings").select("*").eq("key", key).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found.")
    return result.data


@router.put("/{key}", response_model=SettingRead)
async def upsert_setting(key: str, body: SettingUpdate, user: AdminDep):
    """Create or replace a setting value by key. Accessible by: super_admin, hr_manager."""
    return _upsert(key, body.value)


# ── Typed convenience endpoints ───────────────────────────────────────────────

@router.get("/scoring-weights", response_model=AIWeights)
async def get_scoring_weights(user: HRStaffDep):
    """Returns the current AI scoring weights read from the settings table."""
    val = get_setting_value("ai_weights")
    if val is None:
        return AIWeights()   # defaults
    return AIWeights(**val)


@router.put("/scoring-weights", response_model=AIWeights)
async def update_scoring_weights(body: AIWeights, user: AdminDep):
    """
    Persist updated AI scoring weights.
    The resume_parser service reads this key at score time — changes
    take effect for all new candidate submissions immediately.
    Accessible by: super_admin, hr_manager
    """
    _upsert("ai_weights", body.model_dump())
    # Reload the in-process weights cache so new submissions use updated values
    try:
        from app.services import resume_parser as rp  # local import avoids circular
        rp.WEIGHTS = {
            "skills":         body.skills         / 100,
            "experience":     body.experience      / 100,
            "education":      body.education       / 100,
            "projects":       body.projects        / 100,
            # certifications and soft_skills are not in the settings UI; keep their defaults
            "certifications": rp.WEIGHTS.get("certifications", 0.10),
            "soft_skills":    rp.WEIGHTS.get("soft_skills",    0.05),
        }
        logger.info("Resume parser weights reloaded: %s", rp.WEIGHTS)
    except Exception as exc:
        logger.warning("Could not reload resume_parser weights in-process: %s", exc)

    return body


@router.get("/notifications", response_model=NotificationPrefs)
async def get_notification_prefs(user: HRStaffDep):
    """Returns current notification preferences."""
    val = get_setting_value("notification_prefs")
    if val is None:
        return NotificationPrefs()
    return NotificationPrefs(**val)


@router.put("/notifications", response_model=NotificationPrefs)
async def update_notification_prefs(body: NotificationPrefs, user: AdminDep):
    """Persists notification preferences. Accessible by: super_admin, hr_manager."""
    _upsert("notification_prefs", body.model_dump())
    return body


@router.get("/integrations", response_model=Integrations)
async def get_integrations(user: HRStaffDep):
    """Returns current integration toggle states."""
    val = get_setting_value("integrations")
    if val is None:
        return Integrations()
    return Integrations(**val)


@router.put("/integrations", response_model=Integrations)
async def update_integrations(body: Integrations, user: AdminDep):
    """Persists integration toggle states. Accessible by: super_admin, hr_manager."""
    _upsert("integrations", body.model_dump())
    return body


@router.get("/shortlist-threshold", response_model=ShortlistThreshold)
async def get_shortlist_threshold(user: HRStaffDep):
    """Returns the current AI shortlisting threshold and borderline floor."""
    val = get_setting_value("shortlist_threshold")
    if val is None:
        return ShortlistThreshold()
    return ShortlistThreshold(**val)


@router.put("/shortlist-threshold", response_model=ShortlistThreshold)
async def update_shortlist_threshold(body: ShortlistThreshold, user: AdminDep):
    """
    Update the AI shortlisting threshold.

    - Candidates scoring ≥ threshold are auto-shortlisted
    - Candidates between borderline_floor and threshold are flagged for manual review
    - Candidates below borderline_floor are auto-rejected

    Accessible by: super_admin, hr_manager
    """
    _upsert("shortlist_threshold", body.model_dump())
    return body
