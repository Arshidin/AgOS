"""
AgOS AI Gateway — Configuration & Supabase Client

P-AI-6: Service account authentication (service_role key), NOT user JWT.
All RPC calls go through this single client.
"""
import os
import logging
from functools import lru_cache

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger("agos.gateway")


class Settings:
    """Environment-based settings. No defaults for secrets — fail fast."""

    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")

    # WhatsApp Cloud API
    WHATSAPP_TOKEN: str = os.environ.get("WHATSAPP_TOKEN", "")
    WHATSAPP_WEBHOOK_SECRET: str = os.environ.get("WHATSAPP_WEBHOOK_SECRET", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")

    # Internal API key for cron endpoints
    INTERNAL_API_KEY: str = os.environ.get("INTERNAL_API_KEY", "")

    # Claude model for main agent
    CLAUDE_MODEL: str = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-20250514")
    # Claude model for classification / confirmation parsing (cheaper, faster)
    CLAUDE_HAIKU_MODEL: str = os.environ.get(
        "CLAUDE_HAIKU_MODEL", "claude-haiku-4-5-20251001"
    )

    # Context TTL in seconds (Dok 5 §5.3 R-9: 5 minutes)
    FARM_CONTEXT_TTL_SECONDS: int = 300

    # Message history (Dok 5 §3.6 R-5)
    MAX_RECENT_MESSAGES: int = 10
    SUMMARIZE_EVERY_N: int = 10

    # Role override timeout (Dok 5 §4.4 R-4)
    ROLE_OVERRIDE_TIMEOUT_MESSAGES: int = 5

    # Embedding Worker (Dok 5 §15): provider + API keys.
    # EMBEDDING_PROVIDER: "voyage" (primary, per Dok 5) | "openai" (fallback)
    # vector(1536) compatible with both text-embedding-3-small and voyage-3.
    EMBEDDING_PROVIDER: str = os.environ.get("EMBEDDING_PROVIDER", "voyage")
    VOYAGE_API_KEY: str = os.environ.get("VOYAGE_API_KEY", "")
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    # Batch size: claim_embedding_batch pulls this many jobs per cycle.
    EMBEDDING_BATCH_SIZE: int = int(os.environ.get("EMBEDDING_BATCH_SIZE", "10"))
    # Interval in seconds between embedding cycles (Dok 5 §15.2: 60s default).
    EMBEDDING_INTERVAL_SECONDS: int = int(os.environ.get("EMBEDDING_INTERVAL_SECONDS", "60"))

    # TAXONOMY-M3b (ADR-ANIMAL-01): when "on", tool schemas + extraction
    # validation pull the canonical L1 code list via rpc_list_animal_categories
    # at graph init, otherwise the hardcoded ANIMAL_CATEGORY_MAPPING keys are
    # the source of truth.
    # Flipped on (2026-04-16): snapshot parity 3/3 confirmed.
    # Hardcoded FALLBACK_L1_CODES stays as fallback (HS-5 additive arch).
    # Override: set TAXONOMY_RPC_READ=false in Railway env to revert.
    TAXONOMY_RPC_READ: bool = os.environ.get("TAXONOMY_RPC_READ", "true").lower() in (
        "1", "true", "on", "yes",
    )

    def validate(self) -> list[str]:
        """Return list of missing required env vars."""
        missing = []
        if not self.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not self.SUPABASE_SERVICE_ROLE_KEY:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if not self.ANTHROPIC_API_KEY:
            missing.append("ANTHROPIC_API_KEY")
        return missing


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """
    P-AI-6: Create Supabase client with service_role key.
    NEVER use user JWT — AI Gateway authenticates as service account.
    """
    settings = get_settings()
    missing = settings.validate()
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
