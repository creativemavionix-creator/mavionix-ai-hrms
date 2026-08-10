from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel

ChannelStatus = Literal["active", "warning", "inactive", "standby", "critical"]
MessageStatus = Literal["sent", "pending", "failed"]


# ── Channels ──────────────────────────────────────────────────────────────────

class ChannelBase(BaseModel):
    name:            str
    type:            str
    channel_id_code: str
    status:          ChannelStatus = "active"
    sent_volume:     int           = 0
    delivered_pct:   float         = 0.0


class ChannelCreate(ChannelBase):
    pass


class ChannelUpdate(BaseModel):
    name:          Optional[str]           = None
    type:          Optional[str]           = None
    status:        Optional[ChannelStatus] = None
    sent_volume:   Optional[int]           = None
    delivered_pct: Optional[float]         = None


class ChannelRead(ChannelBase):
    id: str


# ── Messages ──────────────────────────────────────────────────────────────────

class MessageBase(BaseModel):
    candidate_id: str
    channel_id:   str
    subject:      Optional[str] = None
    body:         str
    status:       MessageStatus = "pending"


class MessageCreate(MessageBase):
    pass


class MessageRead(MessageBase):
    id:      str
    sent_at: Optional[datetime] = None

    # Denormalised join fields for UI display
    candidate_name: Optional[str] = None


class MessageStats(BaseModel):
    """Stat-card counts for CommunicationView."""
    sent_today:      int
    pending_count:   int
    response_rate:   float   # delivered_pct average across active channels
    scheduled_sends: int     # always 0 for MVP — scheduling not yet implemented
