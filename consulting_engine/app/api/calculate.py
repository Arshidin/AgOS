"""POST /api/v1/calculate — запуск расчёта финансовой модели."""

from fastapi import APIRouter, HTTPException
from supabase import create_client

from app.config import settings
from app.models.schemas import CalculateRequest, CalculateResponse
from app.engine.orchestrator import run_calculation

router = APIRouter()


def _get_supabase():
    """Supabase client with service_role (bypasses RLS)."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


@router.post("/calculate", response_model=CalculateResponse)
async def calculate(request: CalculateRequest):
    """Запуск полного расчёта финансовой модели.

    1. Загружает справочники из Supabase
    2. Запускает 11 модулей по порядку зависимостей
    3. Сохраняет версию через RPC
    4. Возвращает результаты
    """
    sb = _get_supabase()

    # Загрузка справочников
    ref_response = sb.table("consulting_reference_data").select("*").execute()
    reference_data = ref_response.data

    # Расчёт
    try:
        results = run_calculation(
            input_params=request.input_params,
            reference_data=reference_data,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Calculation error: {e}")

    # Сохранение версии через RPC
    version_response = sb.rpc(
        "rpc_save_consulting_version",
        {
            "p_organization_id": request.organization_id,
            "p_project_id": request.project_id,
            "p_input_params": request.input_params.model_dump(mode="json"),
            "p_results": results,
        },
    ).execute()

    version_id = version_response.data

    # Получение номера версии
    version_detail = (
        sb.table("consulting_project_versions")
        .select("version_number")
        .eq("id", version_id)
        .single()
        .execute()
    )

    return CalculateResponse(
        version_id=version_id,
        version_number=version_detail.data["version_number"],
        results=results,
    )
