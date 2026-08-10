"""
Communications router – /api/communications

GET  /api/communications/channels              list all channels
GET  /api/communications/channels/{id}         get single channel
POST /api/communications/channels              create channel
PATCH /api/communications/channels/{id}        update channel

POST /api/communications/messages              send message (logs to DB, TODO real delivery)
GET  /api/communications/messages              list messages with filters
GET  /api/communications/messages/stats        stat-card counts
GET  /api/communications/messages/{id}         get single message

Delivery TODO
-------------
Real email / SMS delivery is intentionally skipped for MVP.
The message is written to the DB with status='sent' immediately.
To wire up real delivery:
  - Email: pip install sendgrid, read SENDGRID_API_KEY from settings, call
           sendgrid.SendGridAPIClient(key).send(mail)
  - SMS:   pip install twilio, read TWILIO_* from settings, call
           twilio.rest.Client(sid, token).messages.create(...)
  - On delivery error: catch exception, update message status to 'failed'.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_role
from app.database import get_user_client, supabase
from app.schemas.communications import (
    ChannelCreate,
    ChannelRead,
    ChannelUpdate,
    MessageCreate,
    MessageRead,
    MessageStats,
)
from app.schemas.users import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/communications", tags=["Communications"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
HRStaffDep     = Annotated[CurrentUser, Depends(require_role(
    "super_admin", "hr_manager", "recruiter"
))]
AdminDep       = Annotated[CurrentUser, Depends(require_role("super_admin", "hr_manager"))]


# ── helpers ───────────────────────────────────────────────────────────────────

def _enrich_message(msg: dict, cand_map: dict) -> dict:
    msg["candidate_name"] = cand_map.get(msg.get("candidate_id", ""), {}).get("name")
    return msg


# ── Channels ──────────────────────────────────────────────────────────────────

@router.get("/channels", response_model=list[ChannelRead])
async def list_channels(user: CurrentUserDep):
    """List all configured dispatch channels ordered by channel_id_code."""
    client = get_user_client(user.token)
    try:
        result = client.table("communication_channels").select("*").order("channel_id_code").execute()
        return result.data or []
    except Exception as exc:
        logger.warning(f"Could not list communication channels: {exc}")
        return []


@router.get("/channels/{channel_id}", response_model=ChannelRead)
async def get_channel(channel_id: str, user: CurrentUserDep):
    """Fetch a single channel by UUID."""
    client = get_user_client(user.token)
    result = (
        client.table("communication_channels")
        .select("*").eq("id", channel_id).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Channel not found.")
    return result.data


@router.post("/channels", response_model=ChannelRead, status_code=status.HTTP_201_CREATED)
async def create_channel(body: ChannelCreate, user: AdminDep):
    """Register a new communication channel. Accessible by: super_admin, hr_manager."""
    client = get_user_client(user.token)
    result = client.table("communication_channels").insert(body.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create channel.")
    return result.data[0]


@router.patch("/channels/{channel_id}", response_model=ChannelRead)
async def update_channel(channel_id: str, body: ChannelUpdate, user: AdminDep):
    """Update a channel's metadata or status. Accessible by: super_admin, hr_manager."""
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=422, detail="No fields provided for update.")

    client = get_user_client(user.token)
    result = (
        client.table("communication_channels")
        .update(payload).eq("id", channel_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Channel not found.")
    return result.data[0]


# ── Messages ──────────────────────────────────────────────────────────────────

@router.get("/messages/stats", response_model=MessageStats)
async def get_message_stats(user: CurrentUserDep):
    """
    Returns stat-card counts for CommunicationView:
      sent_today, pending_count, response_rate (avg delivered_pct across active channels),
      scheduled_sends (always 0 — scheduling not yet implemented).
    """
    client = get_user_client(user.token)

    sent_today = 0
    pending_count = 0
    avg_delivered = 88.0

    try:
        now = datetime.now(timezone.utc)
        today_start_iso = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).isoformat()

        all_msgs_res = client.table("communication_messages").select("status, sent_at").execute()
        all_msgs = all_msgs_res.data or []

        sent_today = sum(1 for m in all_msgs if m.get("status") == "sent" and (m.get("sent_at") or "") >= today_start_iso)
        pending_count = sum(1 for m in all_msgs if m.get("status") == "pending")

        ch_res = client.table("communication_channels").select("delivered_pct, status").execute()
        channels = ch_res.data or []
        active_pcts = [c["delivered_pct"] for c in channels if c.get("status") == "active" and c.get("delivered_pct") is not None]
        avg_delivered = round(sum(active_pcts) / len(active_pcts), 1) if active_pcts else 88.0
    except Exception as exc:
        logger.warning(f"Could not fetch message stats: {exc}")

    return MessageStats(
        sent_today=sent_today,
        pending_count=pending_count,
        response_rate=avg_delivered,
        scheduled_sends=0,
    )


@router.post("/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(body: MessageCreate, user: HRStaffDep):
    """
    Log a message to the DB and mark it as 'sent'.

    MVP behaviour: no real email/SMS is dispatched. The message row is written
    with status='sent' and sent_at=now(). Channel sent_volume is incremented.

    TODO — real delivery:
      Email: configure SENDGRID_API_KEY in .env, import sendgrid, call
             sendgrid.SendGridAPIClient(settings.sendgrid_api_key).send(mail)
      SMS:   configure TWILIO_* in .env, import twilio.rest, call
             Client(sid, token).messages.create(body=..., from_=..., to=...)
      On any delivery error: set status='failed', do NOT increment sent_volume.
    """
    # Validate channel exists
    chan_result = supabase.table("communication_channels").select("id, name").eq(
        "id", body.channel_id
    ).maybe_single().execute()
    if not chan_result.data:
        raise HTTPException(status_code=404, detail="Channel not found.")

    # Validate candidate exists
    cand_result = supabase.table("candidates").select("id").eq(
        "id", body.candidate_id
    ).maybe_single().execute()
    if not cand_result.data:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Insert message as 'sent' (MVP — real delivery would happen here first)
    msg_payload = {
        "candidate_id": body.candidate_id,
        "channel_id":   body.channel_id,
        "subject":      body.subject,
        "body":         body.body,
        "status":       "sent",
        "sent_at":      now_iso,
    }
    msg_result = supabase.table("messages").insert(msg_payload).execute()
    if not msg_result.data:
        raise HTTPException(status_code=500, detail="Failed to log message.")

    # Increment channel sent_volume
    try:
        cur = supabase.table("communication_channels").select("sent_volume").eq(
            "id", body.channel_id
        ).single().execute()
        new_vol = (cur.data.get("sent_volume") or 0) + 1
        supabase.table("communication_channels").update(
            {"sent_volume": new_vol}
        ).eq("id", body.channel_id).execute()
    except Exception as exc:
        logger.warning("Could not increment sent_volume: %s", exc)

    msg = msg_result.data[0]
    cand_map = {body.candidate_id: cand_result.data}
    return _enrich_message(msg, cand_map)


@router.get("/messages", response_model=list[MessageRead])
async def list_messages(
    user: CurrentUserDep,
    candidate_id: Optional[str] = None,
    channel_id:   Optional[str] = None,
    msg_status:   Optional[str] = None,
    limit:  int = 50,
    offset: int = 0,
):
    """List outbox messages with optional filters. Newest first."""
    client = get_user_client(user.token)

    query = client.table("messages").select("*").order("sent_at", desc=True)
    if candidate_id: query = query.eq("candidate_id", candidate_id)
    if channel_id:   query = query.eq("channel_id",   channel_id)
    if msg_status:   query = query.eq("status",        msg_status)

    result = query.range(offset, offset + limit - 1).execute()
    rows   = result.data or []

    # Enrich with candidate names
    cand_ids = list({r["candidate_id"] for r in rows if r.get("candidate_id")})
    cand_map: dict = {}
    if cand_ids:
        cands = (
            client.table("candidates").select("id, name").in_("id", cand_ids).execute().data or []
        )
        cand_map = {c["id"]: c for c in cands}

    return [_enrich_message(r, cand_map) for r in rows]


@router.get("/messages/{message_id}", response_model=MessageRead)
async def get_message(message_id: str, user: CurrentUserDep):
    """Fetch a single message by UUID."""
    client = get_user_client(user.token)
    result = (
        client.table("messages").select("*").eq("id", message_id).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Message not found.")

    msg = result.data
    cand_map: dict = {}
    if msg.get("candidate_id"):
        cand = (
            client.table("candidates").select("id, name")
            .eq("id", msg["candidate_id"]).maybe_single().execute()
        )
        if cand.data:
            cand_map = {cand.data["id"]: cand.data}

    return _enrich_message(msg, cand_map)


# ── AI Email Draft Generation ─────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel


class _DraftRequest(_BaseModel):
    candidate_id: str
    channel_id: str   # UUID of the communication channel


class _DraftResponse(_BaseModel):
    subject: str
    body: str


@router.post("/messages/generate-draft", response_model=_DraftResponse)
async def generate_message_draft(req: _DraftRequest, user: HRStaffDep):
    """
    Generate an AI-written email/message draft using DeepSeek.

    Takes the candidate context (name, role, stage, AI score) and
    the channel purpose to produce an appropriate subject + body.

    Returns editable text — user can tweak before sending.
    """
    from openai import OpenAI
    from app.config import settings as app_settings

    # 1. Fetch candidate + application context
    cand_result = supabase.table("candidates").select("id, name, email").eq(
        "id", req.candidate_id
    ).maybe_single().execute()
    if not cand_result.data:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    candidate = cand_result.data

    # Get their latest application for context
    app_result = (
        supabase.table("applications")
        .select("stage, ai_score, match_quality, job_id")
        .eq("candidate_id", req.candidate_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    app_data = app_result.data[0] if app_result.data else {}
    stage = app_data.get("stage", "applied")
    ai_score = app_data.get("ai_score")
    job_title = "the position"

    if app_data.get("job_id"):
        job_result = supabase.table("jobs").select("title").eq(
            "id", app_data["job_id"]
        ).maybe_single().execute()
        if job_result.data:
            job_title = job_result.data["title"]

    # 2. Fetch channel info for purpose/context
    chan_result = supabase.table("communication_channels").select("name, type").eq(
        "id", req.channel_id
    ).maybe_single().execute()
    if not chan_result.data:
        raise HTTPException(status_code=404, detail="Channel not found.")
    channel = chan_result.data

    # 3. Determine purpose from channel name
    channel_name = channel["name"].lower()
    if "rejection" in channel_name or "reject" in channel_name:
        purpose = "politely informing the candidate they were not selected"
    elif "offer" in channel_name:
        purpose = "extending a job offer"
    elif "interview" in channel_name or "reminder" in channel_name:
        purpose = "reminding about or scheduling an interview"
    elif "sms" in channel_name:
        purpose = "sending a brief SMS notification about their application status"
    else:
        purpose = "providing an application status update"

    # 4. Build prompt and call DeepSeek
    prompt = f"""Write a professional HR email for a recruitment platform called HireMind AI.

Context:
- Candidate name: {candidate['name']}
- Applied role: {job_title}
- Current pipeline stage: {stage}
- AI match score: {ai_score if ai_score else 'not yet scored'}
- Channel/purpose: {channel['name']} — {purpose}
- Channel type: {channel['type']}

Requirements:
- Generate a subject line and email body
- Tone: professional, warm, concise
- Keep the body under 150 words
- Use the candidate's first name in the greeting
- Sign off as "HireMind AI Recruitment Team"
- If this is an SMS channel, keep body under 160 characters and skip subject

Return ONLY valid JSON in this exact format:
{{"subject": "...", "body": "..."}}"""

    try:
        client = OpenAI(
            api_key=app_settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
        )
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are an expert HR communication assistant. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=500,
        )
        raw = response.choices[0].message.content or ""

        # Parse JSON from response
        import re
        cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
        import json
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                result = json.loads(match.group(0))
            else:
                raise ValueError("Could not parse AI response as JSON")

        return _DraftResponse(
            subject=result.get("subject", ""),
            body=result.get("body", ""),
        )

    except Exception as exc:
        logger.error("AI draft generation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(exc)[:200]}. You can write the message manually.",
        )
