"""
AgOS AI Gateway — Vet Tools (AI-07..10)

Dok 5 §6.2: Vet role tools.
All writes through supabase.rpc() — NEVER direct table access (P-AI-1).
organization_id always from state, NEVER from LLM (D110).

Tools:
    AI-07: create_vet_case     -> rpc_create_vet_case
    AI-08: add_symptoms        -> rpc_add_vet_symptoms
    AI-09: get_diagnosis       -> rpc_get_vet_diagnosis
    AI-10: get_treatment       -> rpc_get_treatment_protocols
"""
import logging
from typing import Any, Optional

from supabase import Client

logger = logging.getLogger("agos.gateway.tools.vet")


# --------------------------------------------------------------------------
# Tool definitions for Claude API (tool_use format)
# organization_id is IMPLICIT — Gateway adds it (D110). LLM never sees it.
# --------------------------------------------------------------------------
VET_TOOL_DEFINITIONS = [
    {
        "name": "create_vet_case",
        "description": (
            "Открыть новый ветеринарный кейс. Используй когда фермер сообщает "
            "о больном или подозрительном животном. "
            "Не создавай дубликат если кейс с похожими симптомами уже открыт."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {
                    "type": "string",
                    "description": "UUID фермы (из контекста, не спрашивай у фермера)",
                },
                "symptoms_text": {
                    "type": "string",
                    "description": "Описание симптомов на языке фермера",
                },
                "severity": {
                    "type": "string",
                    "enum": ["mild", "moderate", "severe", "critical"],
                    "description": "Оценка тяжести: mild=лёгкие, moderate=умеренные, "
                    "severe=тяжёлые, critical=критические",
                },
                "herd_group_id": {
                    "type": "string",
                    "description": "UUID группы скота (если известна из контекста)",
                },
                "affected_heads": {
                    "type": "integer",
                    "description": "Количество пострадавших голов",
                },
            },
            "required": ["farm_id", "symptoms_text"],
        },
    },
    {
        "name": "add_symptoms",
        "description": (
            "Добавить структурированные симптомы к открытому кейсу. "
            "Используй после создания кейса для уточнения симптомов."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "vet_case_id": {
                    "type": "string",
                    "description": "UUID ветеринарного кейса",
                },
                "symptoms_structured": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "symptom_code": {"type": "string"},
                            "confidence": {"type": "number"},
                            "extracted_from_text": {"type": "string"},
                        },
                        "required": ["symptom_code"],
                    },
                    "description": "Массив структурированных симптомов с кодами",
                },
            },
            "required": ["vet_case_id", "symptoms_structured"],
        },
    },
    {
        "name": "get_diagnosis",
        "description": (
            "Получить предварительный AI-диагноз по симптомам кейса. "
            "Возвращает ранжированный список возможных заболеваний. "
            "ВСЕГДА предупреждай что диагноз предварительный и требует подтверждения ветеринара."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "vet_case_id": {
                    "type": "string",
                    "description": "UUID ветеринарного кейса",
                },
                "limit": {
                    "type": "integer",
                    "description": "Максимум кандидатов (по умолчанию 5)",
                },
            },
            "required": ["vet_case_id"],
        },
    },
    {
        "name": "get_treatment_protocols",
        "description": (
            "Получить протоколы лечения из базы данных. "
            "КРИТИЧЕСКИ ВАЖНО: если результат пуст — скажи фермеру "
            '"обратитесь к ветеринару лично". '
            "НИКОГДА не называй дозировки из своих знаний. "
            "Только данные из этого инструмента."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "disease_id": {
                    "type": "string",
                    "description": "UUID заболевания (из результата get_diagnosis)",
                },
                "animal_category_code": {
                    "type": "string",
                    "description": "Код категории животного (BULL_CALF, STEER, COW...)",
                },
            },
            "required": [],
        },
    },
]


def execute_vet_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    organization_id: str,
    supabase: Client,
    actor_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Execute a vet tool via supabase.rpc().

    P-AI-1: All writes through RPC, never direct table access.
    P-AI-2: organization_id injected from state, not from LLM input.

    Returns the RPC result as a dict.
    """
    try:
        if tool_name == "create_vet_case":
            return _create_vet_case(tool_input, organization_id, supabase, actor_id)
        elif tool_name == "add_symptoms":
            return _add_symptoms(tool_input, organization_id, supabase, actor_id)
        elif tool_name == "get_diagnosis":
            return _get_diagnosis(tool_input, organization_id, supabase)
        elif tool_name == "get_treatment_protocols":
            return _get_treatment_protocols(tool_input, organization_id, supabase)
        else:
            return {"error": f"Unknown vet tool: {tool_name}"}
    except Exception as e:
        logger.error("Vet tool %s failed: %s", tool_name, e, exc_info=True)
        return {"error": str(e)}


def _create_vet_case(
    params: dict, org_id: str, supabase: Client, actor_id: Optional[str]
) -> dict:
    """
    AI-07: rpc_create_vet_case
    SQL signature: (p_organization_id, p_farm_id, p_symptoms_text, p_severity,
                    p_herd_group_id, p_affected_heads, p_created_via, p_actor_id, p_ai_context)
    """
    rpc_params = {
        "p_organization_id": org_id,
        "p_farm_id": params["farm_id"],
        "p_symptoms_text": params["symptoms_text"],
        "p_severity": params.get("severity", "moderate"),
        "p_herd_group_id": params.get("herd_group_id"),
        "p_affected_heads": params.get("affected_heads"),
        "p_created_via": "ai_whatsapp",
        "p_actor_id": actor_id,
        "p_ai_context": {"tool": "create_vet_case", "source": "ai_gateway"},
    }
    result = supabase.rpc("rpc_create_vet_case", rpc_params).execute()
    logger.info("AI-07 create_vet_case: org=%s result=%s", org_id[:8], result.data)
    return result.data


def _add_symptoms(
    params: dict, org_id: str, supabase: Client, actor_id: Optional[str]
) -> dict:
    """
    AI-08: rpc_add_vet_symptoms
    SQL signature: (p_organization_id, p_vet_case_id, p_symptoms_structured,
                    p_actor_id, p_ai_context)
    """
    rpc_params = {
        "p_organization_id": org_id,
        "p_vet_case_id": params["vet_case_id"],
        "p_symptoms_structured": params["symptoms_structured"],
        "p_actor_id": actor_id,
        "p_ai_context": {"tool": "add_symptoms", "source": "ai_gateway"},
    }
    result = supabase.rpc("rpc_add_vet_symptoms", rpc_params).execute()
    logger.info("AI-08 add_symptoms: case=%s", params["vet_case_id"][:8])
    return result.data


def _get_diagnosis(params: dict, org_id: str, supabase: Client) -> dict:
    """
    AI-09: rpc_get_vet_diagnosis
    SQL signature: (p_organization_id, p_vet_case_id, p_limit)
    """
    rpc_params = {
        "p_organization_id": org_id,
        "p_vet_case_id": params["vet_case_id"],
        "p_limit": params.get("limit", 5),
    }
    result = supabase.rpc("rpc_get_vet_diagnosis", rpc_params).execute()
    logger.info("AI-09 get_diagnosis: case=%s", params["vet_case_id"][:8])
    return result.data


def _get_treatment_protocols(params: dict, org_id: str, supabase: Client) -> dict:
    """
    AI-10: rpc_get_treatment_protocols
    SQL signature: (p_organization_id, p_disease_id, p_animal_category_code)

    P-AI-4 CRITICAL: If empty result -> AI must respond
    "обратитесь к ветеринару лично". NEVER generate dosages from own knowledge.
    """
    rpc_params = {
        "p_organization_id": org_id,
        "p_disease_id": params.get("disease_id"),
        "p_animal_category_code": params.get("animal_category_code"),
    }
    result = supabase.rpc("rpc_get_treatment_protocols", rpc_params).execute()
    logger.info("AI-10 get_treatment_protocols: disease=%s", params.get("disease_id"))
    return result.data
