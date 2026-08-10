"""
Resume storage service.

In demo_mode: saves to a local temp dir and returns a file:// path.
In production: uploads to Supabase Storage.
"""
from __future__ import annotations

import logging
import os
import tempfile
import uuid

from app.config import settings

logger = logging.getLogger(__name__)


def upload_resume(file_bytes: bytes, filename: str, content_type: str = "application/pdf") -> str:
    """
    Store resume bytes and return a URL.

    Demo mode: writes to a temp directory.
    Production: uploads to Supabase Storage bucket.
    """
    if settings.demo_mode:
        # Store locally in a temp dir
        tmp_dir = os.path.join(tempfile.gettempdir(), "hiremind_resumes")
        os.makedirs(tmp_dir, exist_ok=True)
        safe_name = f"{uuid.uuid4()}_{filename.replace(' ', '_')}"
        path = os.path.join(tmp_dir, safe_name)
        with open(path, "wb") as f:
            f.write(file_bytes)
        logger.info("Demo mode: resume saved to %s", path)
        return f"file://{path}"

    # Production: Supabase Storage
    from app.database import supabase

    BUCKET = settings.resume_bucket

    try:
        supabase.storage.create_bucket(
            BUCKET,
            options={"public": True, "file_size_limit": 10_485_760},
        )
    except Exception:
        pass

    safe_name = f"{uuid.uuid4()}/{filename.replace(' ', '_')}"
    supabase.storage.from_(BUCKET).upload(
        path=safe_name,
        file=file_bytes,
        file_options={"content-type": content_type},
    )
    return supabase.storage.from_(BUCKET).get_public_url(safe_name)
