"""
Application settings loaded from environment variables / .env file.
"""
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Demo mode — when True, uses in-memory store instead of Supabase
    # and bypasses JWT authentication entirely.
    demo_mode: bool = True

    # Supabase (only needed when demo_mode=False)
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = "placeholder"
    supabase_jwt_secret: str = "placeholder"

    # Gemini
    gemini_api_key: str = ""

    # DeepSeek (OpenAI-compatible API)
    deepseek_api_key: str = ""

    # Supabase Storage bucket for resumes
    resume_bucket: str = "resumes"

    # Delivery integrations
    sendgrid_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # App
    app_env: str = "development"
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    portal_base_url: str = "http://localhost:3001"
    internal_service_secret: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        env = (self.app_env or "").strip().lower()
        is_production_env = env in ("production", "prod", "staging")

        if is_production_env and self.demo_mode:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: demo_mode cannot be enabled when app_env is 'production' or 'staging'. Set DEMO_MODE=false."
            )

        if is_production_env:
            jwt_secret = (self.supabase_jwt_secret or "").strip()
            service_key = (self.supabase_service_role_key or "").strip()

            def _is_placeholder(val: str) -> bool:
                if not val:
                    return True
                lower_val = val.lower()
                return "placeholder" in lower_val or lower_val == "your_supabase_service_role_key_here"

            if _is_placeholder(jwt_secret) or _is_placeholder(service_key):
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Production deployment requires valid non-placeholder values for supabase_jwt_secret and supabase_service_role_key."
                )

        return self


settings = Settings()
