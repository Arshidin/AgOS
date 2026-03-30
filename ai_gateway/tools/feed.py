"""
AgOS AI Gateway — Feed Tools (Slice 3)

Dok 5 §6.1: Zootechnician role tools for feed management.
All writes through supabase.rpc() — NEVER direct table access (P-AI-1).
organization_id always from state, NEVER from LLM (D110).

Tools:
    AI-03: get_feeding_plan        -> rpc_get_feeding_plan (d07, read)
    NEW:   get_farm_summary        -> rpc_get_farm_summary (d01, read)
    NEW:   get_current_ration      -> rpc_get_current_ration (d03, read)
    NEW:   update_feed_inventory   -> rpc_upsert_feed_inventory (d03, write, confirmation!)
    NEW:   log_herd_event          -> rpc_log_herd_event (d01, write)
"""
import logging
from typing import Any, Optional

from supabase import Client

logger = logging.getLogger("agos.gateway.tools.feed")


FEED_TOOL_DEFINITIONS = [
    {
        "name": "get_feeding_plan",
        "description": (
            "Получить текущий план кормления фермы: периоды, рационы, "
            "привязки к группам скота. Используй чтобы понять текущий режим кормления."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string", "description": "UUID фермы (из контекста)"},
                "herd_group_id": {"type": "string", "description": "UUID группы скота (необязательно)"},
            },
            "required": ["farm_id"],
        },
    },
    {
        "name": "get_farm_summary",
        "description": (
            "Получить полную сводку по ферме: группы скота, запасы кормов, "
            "активные ветеринарные кейсы, ближайшие задачи."
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
        "name": "get_current_ration",
        "description": (
            "Получить текущие активные рационы для всех групп на ферме. "
            "Возвращает состав рациона, нутриенты, стоимость."
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
        "name": "update_feed_inventory",
        "description": (
            "Обновить запасы корма на ферме. "
            "ВАЖНО: требует подтверждения фермера (P-AI-3). "
            "Сначала покажи что будет записано и спроси Да/Нет."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string", "description": "UUID фермы"},
                "feed_item_code": {"type": "string", "description": "Код корма (HAY_MIXED_GRASS, GRAIN_BARLEY...)"},
                "quantity_kg": {"type": "number", "description": "Количество в кг"},
            },
            "required": ["farm_id", "feed_item_code", "quantity_kg"],
        },
    },
    {
        "name": "log_herd_event",
        "description": (
            "Записать событие стада: изменение поголовья, веса, рождения, продажи и т.д."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string", "description": "UUID фермы"},
                "herd_group_id": {"type": "string", "description": "UUID группы скота (необязательно)"},
                "event_type": {
                    "type": "string",
                    "enum": [
                        "head_count_change", "weight_update", "group_created",
                        "group_removed", "birth", "death", "sale", "purchase",
                        "calving_start", "calving_end", "weaning",
                        "breeding_start", "breeding_end",
                        "stall_start", "stall_end", "pasture_start", "pasture_end",
                    ],
                    "description": "Тип события",
                },
                "value_before": {"type": "number", "description": "Значение до изменения"},
                "value_after": {"type": "number", "description": "Значение после изменения"},
                "notes": {"type": "string", "description": "Примечания"},
            },
            "required": ["farm_id", "event_type", "value_after"],
        },
    },
]


def execute_feed_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    organization_id: str,
    supabase: Client,
    actor_id: Optional[str] = None,
) -> dict[str, Any]:
    """Execute a feed tool via supabase.rpc(). P-AI-1 + P-AI-2."""
    try:
        if tool_name == "get_feeding_plan":
            return _get_feeding_plan(tool_input, organization_id, supabase)
        elif tool_name == "get_farm_summary":
            return _get_farm_summary(tool_input, organization_id, supabase)
        elif tool_name == "get_current_ration":
            return _get_current_ration(tool_input, organization_id, supabase)
        elif tool_name == "update_feed_inventory":
            return _update_feed_inventory(tool_input, organization_id, supabase)
        elif tool_name == "log_herd_event":
            return _log_herd_event(tool_input, organization_id, supabase, actor_id)
        else:
            return {"error": f"Unknown feed tool: {tool_name}"}
    except Exception as e:
        logger.error("Feed tool %s failed: %s", tool_name, e, exc_info=True)
        return {"error": str(e)}


def _get_feeding_plan(params: dict, org_id: str, supabase: Client) -> dict:
    """AI-03: rpc_get_feeding_plan (d07)"""
    rpc_params = {"p_organization_id": org_id, "p_farm_id": params["farm_id"]}
    if params.get("herd_group_id"):
        rpc_params["p_herd_group_id"] = params["herd_group_id"]
    result = supabase.rpc("rpc_get_feeding_plan", rpc_params).execute()
    logger.info("AI-03 get_feeding_plan: org=%s", org_id[:8])
    return result.data or {}


def _get_farm_summary(params: dict, org_id: str, supabase: Client) -> dict:
    """RPC-08: rpc_get_farm_summary (d01, Slice 3)"""
    rpc_params = {"p_organization_id": org_id, "p_farm_id": params["farm_id"]}
    result = supabase.rpc("rpc_get_farm_summary", rpc_params).execute()
    logger.info("RPC-08 get_farm_summary: org=%s", org_id[:8])
    return result.data or {}


def _get_current_ration(params: dict, org_id: str, supabase: Client) -> dict:
    """RPC-24: rpc_get_current_ration (d03, Slice 3). D-S3-2: farm-level."""
    rpc_params = {"p_organization_id": org_id, "p_farm_id": params["farm_id"]}
    result = supabase.rpc("rpc_get_current_ration", rpc_params).execute()
    logger.info("RPC-24 get_current_ration: org=%s", org_id[:8])
    return result.data or []


def _update_feed_inventory(params: dict, org_id: str, supabase: Client) -> dict:
    """RPC-21: rpc_upsert_feed_inventory (d03, Slice 3). D-S3-1: individual fields."""
    feed_code = params.get("feed_item_code")
    if not feed_code:
        return {"error": "feed_item_code is required"}

    # Resolve code -> uuid
    item_result = (
        supabase.table("feed_items")
        .select("id")
        .eq("code", feed_code)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not item_result.data:
        return {"error": f"Feed item not found: {feed_code}"}

    rpc_params = {
        "p_organization_id": org_id,
        "p_farm_id": params["farm_id"],
        "p_feed_item_id": item_result.data[0]["id"],
        "p_quantity_kg": params["quantity_kg"],
        "p_data_source": "ai_extracted",
    }
    result = supabase.rpc("rpc_upsert_feed_inventory", rpc_params).execute()
    logger.info("RPC-21 update_feed_inventory: org=%s feed=%s", org_id[:8], feed_code)
    return result.data or {}


def _log_herd_event(params: dict, org_id: str, supabase: Client, actor_id: Optional[str]) -> dict:
    """RPC-07: rpc_log_herd_event (d01, Slice 3). Append-only (D25)."""
    rpc_params = {
        "p_organization_id": org_id,
        "p_farm_id": params["farm_id"],
        "p_event_type": params["event_type"],
        "p_value_after": params["value_after"],
        "p_data_source": "ai_extracted",
    }
    if params.get("herd_group_id"):
        rpc_params["p_herd_group_id"] = params["herd_group_id"]
    if params.get("value_before") is not None:
        rpc_params["p_value_before"] = params["value_before"]
    if params.get("notes"):
        rpc_params["p_notes"] = params["notes"]

    result = supabase.rpc("rpc_log_herd_event", rpc_params).execute()
    logger.info("RPC-07 log_herd_event: org=%s type=%s", org_id[:8], params["event_type"])
    return result.data or {}
