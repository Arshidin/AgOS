"""
AgOS AI Gateway — Expert/Vet Tools (Slice 6a)

Dok 5 §6.3: Vet role tools for expert operations.
AI-11: get_vaccination_schedule -> rpc_get_vaccination_schedule (d07, read)
AI-12: complete_vaccination_item -> rpc_complete_vaccination_item (d07, write, confirmation!)
AI-13: close_vet_case -> rpc_close_vet_case (d04, write, confirmation!)
"""
import logging
from typing import Any, Optional

from supabase import Client

logger = logging.getLogger("agos.gateway.tools.expert")


EXPERT_TOOL_DEFINITIONS = [
    {
        "name": "get_vaccination_schedule",
        "description": (
            "Получить график вакцинации фермы: предстоящие, просроченные, "
            "выполненные прививки. Используй когда спрашивают о вакцинации."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string", "description": "UUID фермы"},
                "days_ahead": {"type": "integer", "description": "Дней вперёд (по умолчанию 60)"},
            },
            "required": ["farm_id"],
        },
    },
    {
        "name": "complete_vaccination_item",
        "description": (
            "Записать факт вакцинации по пункту плана. "
            "ВАЖНО: требует подтверждения (P-AI-3). "
            "Если у препарата есть период ожидания — будет создано ограничение."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_item_id": {"type": "string", "description": "UUID пункта плана вакцинации"},
                "vet_product_id": {"type": "string", "description": "UUID препарата (вакцины)"},
                "actual_heads": {"type": "integer", "description": "Кол-во привитых голов"},
                "vaccine_batch_number": {"type": "string", "description": "Номер серии вакцины (D101)"},
            },
            "required": ["plan_item_id", "vet_product_id", "actual_heads"],
        },
    },
    {
        "name": "close_vet_case",
        "description": (
            "Закрыть ветеринарный кейс с исходом: выздоровление, гибель или направление. "
            "ВАЖНО: требует подтверждения. При гибели автоматически создаётся событие стада."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "vet_case_id": {"type": "string", "description": "UUID вет. кейса"},
                "outcome": {
                    "type": "string",
                    "enum": ["recovered", "died", "referral"],
                    "description": "Исход: recovered=выздоровел, died=погиб, referral=направлен",
                },
                "resolution_notes": {"type": "string", "description": "Заметки при закрытии"},
            },
            "required": ["vet_case_id", "outcome"],
        },
    },
]


def execute_expert_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    organization_id: str,
    supabase: Client,
    actor_id: Optional[str] = None,
) -> dict[str, Any]:
    """Execute an expert tool via supabase.rpc(). P-AI-1 + P-AI-2."""
    try:
        if tool_name == "get_vaccination_schedule":
            return _get_vaccination_schedule(tool_input, organization_id, supabase)
        elif tool_name == "complete_vaccination_item":
            return _complete_vaccination_item(tool_input, organization_id, supabase, actor_id)
        elif tool_name == "close_vet_case":
            return _close_vet_case(tool_input, organization_id, supabase, actor_id)
        else:
            return {"error": f"Unknown expert tool: {tool_name}"}
    except Exception as e:
        logger.error("Expert tool %s failed: %s", tool_name, e, exc_info=True)
        return {"error": str(e)}


def _get_vaccination_schedule(params: dict, org_id: str, supabase: Client) -> dict:
    """AI-11: rpc_get_vaccination_schedule (d07). Upcoming vaccination items."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_farm_id": params["farm_id"],
        "p_days_ahead": params.get("days_ahead", 60),
    }
    result = supabase.rpc("rpc_get_vaccination_schedule", rpc_params).execute()
    logger.info("AI-11 get_vaccination_schedule: org=%s", org_id[:8])
    return result.data or {}


def _complete_vaccination_item(
    params: dict, org_id: str, supabase: Client, actor_id: Optional[str]
) -> dict:
    """AI-12: rpc_complete_vaccination_item (d07). Confirmation required (P-AI-3)."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_plan_item_id": params["plan_item_id"],
        "p_vet_product_id": params["vet_product_id"],
        "p_actual_heads": params["actual_heads"],
        "p_vaccine_batch_number": params.get("vaccine_batch_number"),
        "p_actor_id": actor_id,
        "p_ai_context": {"tool": "complete_vaccination_item", "source": "ai_gateway"},
    }
    result = supabase.rpc("rpc_complete_vaccination_item", rpc_params).execute()
    logger.info("AI-12 complete_vaccination_item: org=%s item=%s", org_id[:8], params["plan_item_id"][:8])
    return result.data or {}


def _close_vet_case(
    params: dict, org_id: str, supabase: Client, actor_id: Optional[str]
) -> dict:
    """RPC-28: rpc_close_vet_case (d04, Slice 6a). Confirmation required."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_vet_case_id": params["vet_case_id"],
        "p_outcome": params["outcome"],
        "p_resolution_notes": params.get("resolution_notes"),
        "p_actor_id": actor_id,
    }
    result = supabase.rpc("rpc_close_vet_case", rpc_params).execute()
    logger.info("RPC-28 close_vet_case: org=%s case=%s outcome=%s",
                org_id[:8], params["vet_case_id"][:8], params["outcome"])
    return result.data or {}
