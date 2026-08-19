"""
Vercel entry point for the FastAPI backend.

Vercel's Python runtime looks for a request handler inside /api.
This file simply re-exports the existing app defined in app/main.py —
no logic is duplicated or changed, this is wiring only.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app  # noqa: E402

# Vercel's Python runtime (@vercel/python) auto-detects an ASGI `app`
# object in this file and serves it directly — no extra handler needed.
