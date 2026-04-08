"""Configuration for Consulting Engine — Supabase + JWT settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str  # service_role — bypasses RLS
    supabase_jwt_secret: str

    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    environment: str = "development"

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "https://ag-os.vercel.app",
    ]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
