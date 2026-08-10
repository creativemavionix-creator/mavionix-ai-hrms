"""
In-memory data store for demo mode.

Replaces Supabase entirely — all data lives in Python dicts and resets on restart.
Provides the same interface used by routers (table().select(), insert(), update(), etc.)
via a lightweight mock client.

Pre-seeded with sample data so the UI is populated on first load.
"""
from __future__ import annotations

import copy
import json
import os.path as path
import os.path as fs_path
import uuid
from datetime import date, datetime, timezone
from typing import Any


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    return date.today().isoformat()


# ═══════════════════════════════════════════════════════════════════════════════
# SEED DATA
# ═══════════════════════════════════════════════════════════════════════════════

_JOBS_SEED = [
    {"id": "11111111-1111-4111-a111-111111111111", "job_code": "JOB-001", "title": "Senior Backend Engineer", "department": "Engineering", "location": "Bangalore", "status": "active", "priority": "high", "posted_date": "2026-07-06", "description": "Design and build distributed microservices.", "created_by": None, "created_at": _now()},
    {"id": "22222222-2222-4222-a222-222222222222", "job_code": "JOB-002", "title": "UX Designer", "department": "Design", "location": "Remote (India)", "status": "onhold", "priority": "medium", "posted_date": "2026-06-23", "description": "Lead product design for recruitment dashboard.", "created_by": None, "created_at": _now()},
    {"id": "33333333-3333-4333-a333-333333333333", "job_code": "JOB-003", "title": "Data Analyst", "department": "Analytics", "location": "Mumbai", "status": "active", "priority": "high", "posted_date": "2026-07-07", "description": "Build BI dashboards and ETL pipelines.", "created_by": None, "created_at": _now()},
    {"id": "44444444-4444-4444-a444-444444444444", "job_code": "JOB-004", "title": "Frontend Developer", "department": "Engineering", "location": "Remote (India)", "status": "active", "priority": "high", "posted_date": "2026-06-30", "description": "Build React/Next.js applications.", "created_by": None, "created_at": _now()},
    {"id": "55555555-5555-4555-a555-555555555555", "job_code": "JOB-005", "title": "Product Manager", "department": "Product", "location": "Bangalore", "status": "active", "priority": "medium", "posted_date": "2026-07-03", "description": "Own product roadmap for AI features.", "created_by": None, "created_at": _now()},
    {"id": "66666666-6666-4666-a666-666666666666", "job_code": "JOB-006", "title": "ML Engineer", "department": "AI/ML", "location": "Bangalore", "status": "onhold", "priority": "medium", "posted_date": "2026-06-16", "description": "Train and deploy NLP models.", "created_by": None, "created_at": _now()},
]

_CHANNELS_SEED = [
    {"id": _uuid(), "name": "Email Candidate Updates", "type": "Email", "channel_id_code": "CHN-001", "status": "active", "sent_volume": 0, "delivered_pct": 99.40},
    {"id": _uuid(), "name": "Interview Reminders", "type": "SMS & Email", "channel_id_code": "CHN-002", "status": "active", "sent_volume": 0, "delivered_pct": 98.70},
    {"id": _uuid(), "name": "Offer Letter Notifications", "type": "Secure Email + DocuSign", "channel_id_code": "CHN-003", "status": "active", "sent_volume": 0, "delivered_pct": 100.00},
    {"id": _uuid(), "name": "SMS Notifications", "type": "SMS Gateway", "channel_id_code": "CHN-004", "status": "warning", "sent_volume": 0, "delivered_pct": 92.10},
    {"id": _uuid(), "name": "Rejection Templates", "type": "Email", "channel_id_code": "CHN-005", "status": "standby", "sent_volume": 0, "delivered_pct": 99.10},
]

_SETTINGS_SEED = [
    {"id": _uuid(), "key": "ai_weights", "value": {"skills": 40, "experience": 30, "education": 15, "projects": 15}},
    {"id": _uuid(), "key": "notification_prefs", "value": {"email": True, "slack": True, "push": False, "ai_flag": True}},
    {"id": _uuid(), "key": "integrations", "value": {"linkedin": True, "naukri": True, "indeed": False, "slack": True, "email": True}},
    {"id": _uuid(), "key": "shortlist_threshold", "value": {"value": 50, "borderline_floor": 35}},
    {"id": _uuid(), "key": "final_score_weights", "value": {"resume": 20, "assignment": 20, "tech": 25, "interview": 25, "hr": 10}},
]

# ═══════════════════════════════════════════════════════════════════════════════
# STORE
# ═══════════════════════════════════════════════════════════════════════════════

class DemoStore:
    """In-memory & disk-backed data store with table-based access."""

    def __init__(self):
        self.file_path = path.join(path.dirname(__file__), "demo_store.json")
        self.tables: dict[str, list[dict[str, Any]]] = {
            "users": [
                {"id": "demo-user-id", "email": "admin@hiremind.test", "name": "Demo Admin", "role": "super_admin", "created_at": _now()},
            ],
            "jobs": copy.deepcopy(_JOBS_SEED),
            "candidates": [],
            "applications": [],
            "ai_reports": [],
            "interviews": [],
            "communication_channels": copy.deepcopy(_CHANNELS_SEED),
            "messages": [],
            "activity_logs": [],
            "settings": copy.deepcopy(_SETTINGS_SEED),
            "assignments": [],
            "ai_interview_rounds": [],
            "final_recommendations": [],
            "candidate_tokens": [],
        }
        self.load_from_disk()

    def load_from_disk(self):
        try:
            if fs_path.exists(self.file_path):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        for k, v in data.items():
                            if isinstance(v, list):
                                self.tables[k] = v
        except Exception as e:
            print("[DemoStore] Failed to load disk persistence:", e)

    def save_to_disk(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self.tables, f, indent=2)
        except Exception as e:
            print("[DemoStore] Failed to save to disk:", e)

    def _get_table(self, name: str) -> list[dict]:
        return self.tables.setdefault(name, [])

    def table(self, name: str) -> "DemoTableQuery":
        return DemoTableQuery(self._get_table(name), self)


class DemoTableQuery:
    """Mimics the Supabase Python client's fluent query API (subset)."""

    def __init__(self, rows: list[dict], store: DemoStore):
        self._rows = rows
        self._store = store
        self._filters: list[tuple[str, str, Any]] = []
        self._select_cols: str = "*"
        self._order_col: str | None = None
        self._order_desc: bool = False
        self._limit_val: int | None = None
        self._offset_val: int = 0
        self._count_mode: str | None = None
        self._is_single: bool = False
        self._is_maybe_single: bool = False
        self._in_filters: list[tuple[str, list]] = []
        self._pending_insert: dict | list[dict] | None = None
        self._pending_update: dict | None = None
        self._pending_delete: bool = False
        self._pending_upsert: tuple[dict, str] | None = None

    def select(self, cols: str = "*", count: str | None = None) -> "DemoTableQuery":
        self._select_cols = cols
        self._count_mode = count
        return self

    def eq(self, col: str, val: Any) -> "DemoTableQuery":
        self._filters.append((col, "eq", val))
        return self

    def in_(self, col: str, values: list) -> "DemoTableQuery":
        self._in_filters.append((col, values))
        return self

    def order(self, col: str, desc: bool = False) -> "DemoTableQuery":
        self._order_col = col
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "DemoTableQuery":
        self._limit_val = n
        return self

    def range(self, start: int, end: int) -> "DemoTableQuery":
        self._offset_val = start
        self._limit_val = end - start + 1
        return self

    def single(self) -> "DemoTableQuery":
        self._is_single = True
        return self

    def maybe_single(self) -> "DemoTableQuery":
        self._is_maybe_single = True
        return self

    def _apply_filters(self) -> list[dict]:
        rows = self._rows
        for col, op, val in self._filters:
            if op == "eq":
                rows = [r for r in rows if r.get(col) == val]
        for col, values in self._in_filters:
            rows = [r for r in rows if r.get(col) in values]
        return rows

    def _apply_order(self, rows: list[dict]) -> list[dict]:
        if self._order_col:
            rows = sorted(rows, key=lambda r: r.get(self._order_col, ""), reverse=self._order_desc)
        return rows

    def _apply_pagination(self, rows: list[dict]) -> list[dict]:
        rows = rows[self._offset_val:]
        if self._limit_val:
            rows = rows[:self._limit_val]
        return rows

    def _resolve_embedded(self, rows: list[dict]) -> list[dict]:
        """Handle embedded resource selects like 'applications(count)' or 'jobs(title)'."""
        if "(" not in self._select_cols:
            return rows

        import re
        embeds = re.findall(r"(\w+)\((\w+)\)", self._select_cols)
        result = []
        for row in rows:
            row = dict(row)
            for table_name, field in embeds:
                related_table = self._store._get_table(table_name)
                if field == "count":
                    # Count related rows where FK matches
                    fk = "job_id" if table_name == "applications" else f"{table_name[:-1]}_id"
                    count = sum(1 for r in related_table if r.get(fk) == row.get("id"))
                    row[table_name] = [{"count": count}]
                else:
                    # Join: look up by FK on this row
                    fk = f"{table_name[:-1]}_id" if not table_name.endswith("s") else f"{table_name}_id"
                    # Common case: jobs(title) from applications
                    if table_name == "jobs" and "job_id" in row:
                        match = next((r for r in related_table if r["id"] == row["job_id"]), None)
                        row[table_name] = {field: match.get(field)} if match else None
                    elif table_name == "candidates" and "candidate_id" in row:
                        match = next((r for r in related_table if r["id"] == row["candidate_id"]), None)
                        row[table_name] = {field: match.get(field)} if match else None
                    else:
                        row[table_name] = None
            result.append(row)
        return result

    def execute(self) -> "DemoResult":
        # ── Handle pending mutations first ────────────────────────────────────
        if self._pending_insert is not None:
            payload = self._pending_insert
            if isinstance(payload, list):
                for p in payload:
                    if "id" not in p:
                        p["id"] = _uuid()
                    if "created_at" not in p:
                        p["created_at"] = _now()
                    self._rows.append(p)
                return DemoResult(data=copy.deepcopy(payload), count=len(payload))
            else:
                if "id" not in payload:
                    payload["id"] = _uuid()
                if "created_at" not in payload:
                    payload["created_at"] = _now()
                self._rows.append(payload)
                self._store.save_to_disk()
                return DemoResult(data=[copy.deepcopy(payload)], count=1)

        if self._pending_update is not None:
            rows = self._apply_filters()
            updated = []
            for row in rows:
                row.update(self._pending_update)
                updated.append(copy.deepcopy(row))
            self._store.save_to_disk()
            return DemoResult(data=updated, count=len(updated))

        if self._pending_delete:
            rows_to_delete = self._apply_filters()
            ids_to_del = {id(r) for r in rows_to_delete}
            removed = [r for r in self._rows if id(r) in ids_to_del]
            self._rows[:] = [r for r in self._rows if id(r) not in ids_to_del]
            self._store.save_to_disk()
            return DemoResult(data=removed, count=len(removed))

        if self._pending_upsert is not None:
            payload, key = self._pending_upsert
            existing = next((r for r in self._rows if r.get(key) == payload.get(key)), None)
            if existing:
                existing.update(payload)
                self._store.save_to_disk()
                return DemoResult(data=[copy.deepcopy(existing)], count=1)
            else:
                if "id" not in payload:
                    payload["id"] = _uuid()
                if "created_at" not in payload:
                    payload["created_at"] = _now()
                self._rows.append(payload)
                self._store.save_to_disk()
                return DemoResult(data=[copy.deepcopy(payload)], count=1)

        # ── SELECT query ──────────────────────────────────────────────────────
        rows = self._apply_filters()
        rows = self._apply_order(rows)
        rows = self._apply_pagination(rows)
        rows = self._resolve_embedded(rows)

        if self._is_single or self._is_maybe_single:
            data = rows[0] if rows else None
            return DemoResult(data=data, count=len(self._apply_filters()))

        return DemoResult(data=copy.deepcopy(rows), count=len(self._apply_filters()))

    def insert(self, payload: dict | list[dict]) -> "DemoTableQuery":
        """Stage an insert — call .execute() to commit."""
        self._pending_insert = payload
        return self

    def update(self, payload: dict) -> "DemoTableQuery":
        """Stage an update — call .execute() to commit."""
        self._pending_update = payload
        return self

    def delete(self) -> "DemoTableQuery":
        """Stage a delete — call .execute() to commit."""
        self._pending_delete = True
        return self

    def upsert(self, payload: dict, on_conflict: str = "id") -> "DemoTableQuery":
        """Stage an upsert — call .execute() to commit."""
        self._pending_upsert = (payload, on_conflict)
        return self


class DemoResult:
    """Mimics the Supabase execute() result."""
    def __init__(self, data: Any = None, count: int = 0):
        self.data = data
        self.count = count


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON
# ═══════════════════════════════════════════════════════════════════════════════

store = DemoStore()
