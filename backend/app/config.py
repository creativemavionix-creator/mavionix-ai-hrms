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
    # and bypasses JWT authentication entirely. Defaults to False for production safety.
    demo_mode: bool = False

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
    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,https://mavionix-ai-hrms.vercel.app"
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

        def _is_placeholder(val: str) -> bool:
            if not val or not val.strip():
                return True
            lower_val = val.lower().strip()
            return (
                "placeholder" in lower_val
                or "your_" in lower_val
                or lower_val in ("none", "null", "false", "")
            )

        if not self.demo_mode:
            jwt_secret = (self.supabase_jwt_secret or "").strip()
            service_key = (self.supabase_service_role_key or "").strip()
            deepseek_key = (self.deepseek_api_key or "").strip()

            missing = []
            if _is_placeholder(jwt_secret):
                missing.append("SUPABASE_JWT_SECRET")
            if _is_placeholder(service_key):
                missing.append("SUPABASE_SERVICE_ROLE_KEY")
            if _is_placeholder(deepseek_key):
                missing.append("DEEPSEEK_API_KEY")

            if missing:
                raise ValueError(
                    f"CRITICAL CONFIGURATION ERROR: DEMO_MODE=false requires valid non-placeholder values for: {', '.join(missing)}. "
                    "Update backend/.env with valid credentials or enable DEMO_MODE=true for local testing."
                )

        return self


settings = Settings()

