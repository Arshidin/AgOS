"""POST /api/v1/calculate — запуск расчёта финансовой модели."""

import uuid
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import CalculateRequest, CalculateResponse
from app.engine.orchestrator import run_calculation

router = APIRouter()


def _get_supabase():
    """Supabase client with service_role. Returns None if not configured."""
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    from supabase import create_client
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _load_feed_reference(sb, organization_id: str, project_id: str) -> dict:
    """Load feed reference data from d03_feed tables and consulting rations.

    Returns dict with keys:
      - feed_prices_d03: list of {feed_item_id, code, price_per_kg}
      - feed_consumption_norms: list of norm records
      - consulting_rations: list of ration_versions for this project
    """
    result = {"feed_prices_d03": [], "feed_consumption_norms": [], "consulting_rations": []}
    if not sb:
        return result

    try:
        fp = sb.table("feed_prices") \
            .select("feed_item_id, price_per_kg, region_id, valid_from, valid_to, feed_items(code)") \
            .eq("is_active", True) \
            .execute()
        result["feed_prices_d03"] = fp.data or []
    except Exception:
        pass

    try:
        # DEF-FEED-NORMS-01: embed animal_category.code so _calc_from_norms can
        # map norms to herd groups via CATEGORY_CODE_TO_HERD instead of the
        # broken "reproducer"-substring heuristic.
        fn = sb.table("feed_consumption_norms") \
            .select("*, animal_categories(code)") \
            .execute()
        result["feed_consumption_norms"] = fn.data or []
    except Exception:
        pass

    try:
        rations = sb.rpc(
            "rpc_get_consulting_rations",
            {"p_organization_id": organization_id, "p_consulting_project_id": project_id},
        ).execute()
        result["consulting_rations"] = rations.data or []
    except Exception:
        pass

    return result


@router.post("/calculate", response_model=CalculateResponse)
async def calculate(request: CalculateRequest):
    """Запуск полного расчёта финансовой модели.

    1. Загружает справочники из Supabase (если доступен)
    2. Загружает кормовые справочники из d03_feed + consulting rations
    3. Запускает 11 модулей по порядку зависимостей
    4. Сохраняет версию через RPC (если Supabase доступен)
    5. Возвращает результаты
    """
    sb = _get_supabase()

    # Загрузка справочников (пустой список если Supabase недоступен)
    reference_data = []
    if sb:
        try:
            ref_response = sb.table("consulting_reference_data").select("*").execute()
            reference_data = ref_response.data or []
        except Exception:
            pass  # Continue without reference data

    # Загрузка кормовых справочников (d03_feed + consulting rations)
    feed_refs = _load_feed_reference(sb, request.organization_id, request.project_id)

    # Расчёт
    try:
        results = run_calculation(
            input_params=request.input_params,
            reference_data=reference_data,
            extra_refs=feed_refs,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Calculation error: {e}")

    # Сохранение версии (если Supabase доступен)
    version_id = str(uuid.uuid4())
    version_number = 1

    if sb:
        try:
            version_response = sb.rpc(
                "rpc_save_consulting_version",
                {
                    "p_organization_id": request.organization_id,
                    "p_project_id": request.project_id,
                    "p_input_params": request.input_params.model_dump(mode="json"),
                    "p_results": results,
                },
            ).execute()
            version_id = str(version_response.data)

            version_detail = (
                sb.table("consulting_project_versions")
                .select("version_number")
                .eq("id", version_id)
                .single()
                .execute()
            )
            version_number = version_detail.data["version_number"]
        except Exception as e:
            import traceback
            print(f"[WARN] Failed to save version to Supabase: {e}")
            traceback.print_exc()

    return CalculateResponse(
        version_id=version_id,
        version_number=version_number,
        results=results,
    )
