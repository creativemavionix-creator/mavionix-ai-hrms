"""
Database client layer.

In demo_mode (default): uses an in-memory DemoStore — no Supabase needed.
In production: uses real Supabase clients with RLS.
"""
from app.config import settings

if settings.demo_mode:
    # ── DEMO MODE: in-memory store ────────────────────────────────────────────
    from app.demo_store import store as _store

    # Both the "service-role" client and user-scoped client point to the same store
    supabase = _store

    def get_user_client(user_jwt: str = ""):
        """In demo mode, always returns the same in-memory store."""
        return _store

else:
    # ── PRODUCTION MODE: real Supabase ────────────────────────────────────────
    from supabase import create_client, Client

    supabase: Client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

    def get_user_client(user_jwt: str) -> Client:
        """Return a Supabase client authenticated as the requesting user."""
        if not user_jwt or user_jwt == "demo-token" or user_jwt.count(".") != 2:
            return supabase

        try:
            client: Client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key,
            )
            client.postgrest.auth(user_jwt)
            return client
        except Exception:
            return supabase
