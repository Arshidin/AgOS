"""Configuration for Consulting Engine — Supabase + JWT settings.

All fields have defaults to prevent crash on startup when env vars
are not yet injected (Railway sets env vars after container start).
Actual values come from Railway environment variables.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase — defaults prevent crash; actual values from Railway env
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8080
    environment: str = "production"

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "https://ag-os.vercel.app",
    ]

    # Feature flags
    # TAXONOMY-M3b (ADR-ANIMAL-01): when True, feeding_model reads
    # animal_category → herd_group mappings via rpc_get_category_mappings
    # instead of the hardcoded CATEGORY_CODE_TO_HERD dict.
    # Default False until snapshot parity confirmed in staging.
    taxonomy_rpc_read: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
