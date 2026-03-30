"""
AgOS AI Gateway — Operations Tools (Slice 4)

Dok 5 §6.1: Zootechnician role tools for operations management.
All writes through supabase.rpc() — NEVER direct table access (P-AI-1).

Tools:
    AI-04: get_farm_tasks       -> rpc_get_farm_tasks (d07, read)
    AI-05: complete_farm_task   -> rpc_complete_farm_task (d07, write, confirmation!)
    AI-06: get_production_plan  -> rpc_get_production_plan (d07, read)
    NEW:   get_active_plan      -> rpc_get_active_plan (d05, read)
"""
import logging
from typing import Any, Optional

from supabase import Client

logger = logging.getLogger("agos.gateway.tools.ops")


OPS_TOOL_DEFINITIONS = [
    {
        "name": "get_farm_tasks",
        "description": (
            "Получить задачи фермы на ближайшие N дней. "
            "Используй когда фермер спрашивает 'что делать?', 'какие задачи?', 'план на неделю'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string", "description": "UUID фермы (из контекста)"},
                "days_ahead": {"type": "integer", "description": "Дней вперёд (по умолчанию 14)"},
                "category": {
                    "type": "string",
                    "enum": ["zootechnical", "veterinary", "management"],
                    "description": "Фильтр по категории (необязательно)",
                },
            },
            "required": ["farm_id"],
        },
    },
    {
        "name": "complete_farm_task",
        "description": (
            "Отметить задачу выполненной. "
            "ВАЖНО: требует подтверждения фермера (P-AI-3). "
            "Сначала покажи какая задача будет отмечена и спроси Да/Нет."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "UUID задачи"},
                "result_description": {"type": "string", "description": "Описание результата"},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "get_production_plan",
        "description": (
            "Получить фазы производственного плана: периоды, даты, привязки к группам. "
            "Используй для ответов о 'плане на сезон', 'что по плану в мае'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string", "description": "UUID фермы (из контекста)"},
            },
            "required": ["farm_id"],
        },
    },
    {
        "name": "get_active_plan",
        "description": (
            "Получить полный обзор активного плана: фазы с прогрессом задач, "
            "сводка KPI, предстоящие и просроченные задачи. "
            "Используй для общего обзора 'как дела с планом?', 'мой прогресс'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string", "description": "UUID фермы (из контекста)"},
            },
            "required": ["farm_id"],
        },
    },
]


def execute_ops_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    organization_id: str,
    supabase: Client,
    actor_id: Optional[str] = None,
) -> dict[str, Any]:
    """Execute an ops tool via supabase.rpc(). P-AI-1 + P-AI-2."""
    try:
        if tool_name == "get_farm_tasks":
            return _get_farm_tasks(tool_input, organization_id, supabase)
        elif tool_name == "complete_farm_task":
            return _complete_farm_task(tool_input, organization_id, supabase, actor_id)
        elif tool_name == "get_production_plan":
            return _get_production_plan(tool_input, organization_id, supabase)
        elif tool_name == "get_active_plan":
            return _get_active_plan(tool_input, organization_id, supabase)
        else:
            return {"error": f"Unknown ops tool: {tool_name}"}
    except Exception as e:
        logger.error("Ops tool %s failed: %s", tool_name, e, exc_info=True)
        return {"error": str(e)}


def _get_farm_tasks(params: dict, org_id: str, supabase: Client) -> dict:
    """AI-04: rpc_get_farm_tasks (d07). Upcoming tasks within N days."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_farm_id": params["farm_id"],
        "p_days_ahead": params.get("days_ahead", 14),
    }
    if params.get("category"):
        rpc_params["p_category"] = params["category"]
    result = supabase.rpc("rpc_get_farm_tasks", rpc_params).execute()
    logger.info("AI-04 get_farm_tasks: org=%s days=%s", org_id[:8], params.get("days_ahead", 14))
    return result.data or {}


def _complete_farm_task(params: dict, org_id: str, supabase: Client, actor_id: Optional[str]) -> dict:
    """AI-05: rpc_complete_farm_task (d07). Confirmation required (P-AI-3)."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_task_id": params["task_id"],
        "p_result_description": params.get("result_description"),
        "p_actor_id": actor_id,
        "p_ai_context": {"tool": "complete_farm_task", "source": "ai_gateway"},
    }
    result = supabase.rpc("rpc_complete_farm_task", rpc_params).execute()
    logger.info("AI-05 complete_farm_task: org=%s task=%s", org_id[:8], params["task_id"][:8])
    return result.data or {}


def _get_production_plan(params: dict, org_id: str, supabase: Client) -> dict:
    """AI-06: rpc_get_production_plan (d07). Phases and ration references."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_farm_id": params["farm_id"],
    }
    result = supabase.rpc("rpc_get_production_plan", rpc_params).execute()
    logger.info("AI-06 get_production_plan: org=%s", org_id[:8])
    return result.data or {}


def _get_active_plan(params: dict, org_id: str, supabase: Client) -> dict:
    """RPC-37: rpc_get_active_plan (d05, Slice 4). Full plan overview."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_farm_id": params["farm_id"],
    }
    result = supabase.rpc("rpc_get_active_plan", rpc_params).execute()
    logger.info("RPC-37 get_active_plan: org=%s", org_id[:8])
    return result.data or {}
