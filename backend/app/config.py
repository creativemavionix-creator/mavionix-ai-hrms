"""
Application settings loaded from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Demo mode — when True, uses in-memory store instead of Supabase
    # and bypasses JWT authentication entirely.
    demo_mode: bool = True

    # Supabase (only needed when demo_mode=False)
    supabase_url: str = "https://placeholder.supabase.co"
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
    allowed_origins: str = "http://localhost:3000"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
