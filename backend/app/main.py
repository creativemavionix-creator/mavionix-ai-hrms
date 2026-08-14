"""
HireMind AI – FastAPI application entry point.

Start the development server:
    uvicorn app.main:app --reload --port 8000

Interactive docs:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    dashboard,
    jobs,
    candidates,
    ai_reports,
    interviews,
    communications,
    settings as settings_router,
)
from app.routers.analytics import router as analytics_router
from app.routers.pipeline import router as pipeline_router
from app.routers.assignments import router as assignments_router
from app.routers.ai_rounds import router as ai_rounds_router
from app.routers.candidate_portal import router as candidate_portal_router
from app.routers.support import router as support_router
from app.routers.recruiter_copilot import router as recruiter_copilot_router

# candidates router also serves /api/applications/{id} — no separate router needed

app = FastAPI(
    title="HireMind AI – Recruitment API",
    description=(
        "FastAPI backend for the HireMind AI recruitment dashboard. "
        "Powered by Supabase (PostgreSQL) with JWT auth and row-level security."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(dashboard.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(ai_reports.router)
app.include_router(interviews.router)
app.include_router(communications.router)
app.include_router(settings_router.router)
app.include_router(analytics_router)
app.include_router(pipeline_router)
app.include_router(assignments_router)
app.include_router(ai_rounds_router)
app.include_router(candidate_portal_router)
app.include_router(support_router)
app.include_router(recruiter_copilot_router)


import logging

logger = logging.getLogger("hiremind.security")


@app.on_event("startup")
async def on_startup():
    """Load dynamic scoring weights from the settings table on boot."""
    if settings.demo_mode:
        logger.warning(
            "WARNING: FastAPI backend is running in DEMO_MODE. Authentication is bypassed for local development testing. DO NOT USE IN PRODUCTION."
        )
        return  # No external DB to read from in demo mode
    try:
        from app.services.resume_parser import reload_weights_from_db
        reload_weights_from_db()
    except Exception:
        pass



# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe – returns 200 if the server is running."""
    return {"status": "ok", "service": "hiremind-api"}
