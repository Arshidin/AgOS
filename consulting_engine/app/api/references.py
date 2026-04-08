"""GET /api/v1/references — справочники для wizard UI."""

from fastapi import APIRouter
from supabase import create_client

from app.config import settings

router = APIRouter()


def _get_supabase():
    return create_client(settings.supabase_url, settings.supabase_service_key)


@router.get("/references/{category}")
async def get_references(category: str):
    """Получить справочник по категории."""
    sb = _get_supabase()

    response = (
        sb.table("consulting_reference_data")
        .select("code, data, valid_from, valid_to")
        .eq("category", category)
        .is_("valid_to", "null")
        .order("code")
        .execute()
    )

    return {"category": category, "items": response.data}
