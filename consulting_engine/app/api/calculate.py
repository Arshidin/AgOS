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


@router.post("/calculate", response_model=CalculateResponse)
async def calculate(request: CalculateRequest):
    """Запуск полного расчёта финансовой модели.

    1. Загружает справочники из Supabase (если доступен)
    2. Запускает 11 модулей по порядку зависимостей
    3. Сохраняет версию через RPC (если Supabase доступен)
    4. Возвращает результаты
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

    # Расчёт
    try:
        results = run_calculation(
            input_params=request.input_params,
            reference_data=reference_data,
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
