"""
Focused test suite for HireMind AI security, routing, and authentication remediations.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import is_demo_mode_active
from app.config import settings

client = TestClient(app)


def test_candidate_delete_route_registered_at_api_candidates():
    """Verify that delete candidate route is registered at /api/candidates/{id} and not at root /{id}."""
    routes = [r.path for r in app.routes if getattr(r, "methods", None) and "DELETE" in r.methods]
    assert "/api/candidates/{candidate_id}" in routes, "Candidate delete route must be registered under /api/candidates/"
    assert "/{candidate_id}" not in routes, "Candidate delete route must NOT be registered at root /{candidate_id}"


def test_is_demo_mode_active_logic():
    """Verify is_demo_mode_active fails closed in production and staging environments."""
    original_env = settings.app_env
    original_demo = settings.demo_mode
    try:
        settings.demo_mode = True
        settings.app_env = "production"
        assert is_demo_mode_active() is False, "demo_mode must be inactive when app_env is production"

        settings.app_env = "staging"
        assert is_demo_mode_active() is False, "demo_mode must be inactive when app_env is staging"

        settings.app_env = "development"
        assert is_demo_mode_active() is True, "demo_mode can be active in development"
    finally:
        settings.app_env = original_env
        settings.demo_mode = original_demo


def test_health_check():
    """Verify backend health check probe works cleanly."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
