"""
AgOS AI Gateway — System Prompt Builder

Dok 5 §4.6 (R-11): System prompts from ai_prompts table — not hardcoded (D133).
Fallback to hardcoded defaults ONLY if DB prompts not available.

P-AI-4: System prompt MUST include dosage prohibition for vet role.
"""
import json
import logging
from typing import Optional

from supabase import Client

logger = logging.getLogger("agos.gateway.prompts")

# --------------------------------------------------------------------------
# Fallback prompts — used ONLY when ai_prompts table is empty or unavailable.
# Canonical prompts live in the ai_prompts table (D133).
# --------------------------------------------------------------------------
FALLBACK_PROMPTS = {
    "base": (
        "Ты — AI-консультант ассоциации ТУРАН для казахстанского фермера.\n"
        "Говори на языке фермера: по-русски если пишет по-русски, "
        "по-казахски если пишет на казахском.\n"
        "Отвечай коротко — 2-4 предложения. Фермер занят — он не читает длинные тексты.\n"
        "Никогда не выдумывай факты о конкретной ферме — "
        "используй только данные из инструментов.\n"
        "Организация: {org_name}, регион: {region}, "
        "уровень членства: {membership_level}.\n"
        "Активных групп скота: {herd_groups_count}."
    ),
    "vet": (
        "Ты — ветеринарный консультант. Помогаешь с симптомами, диагностикой, вакцинацией.\n"
        "КРИТИЧЕСКИ ВАЖНО: дозировки препаратов — ТОЛЬКО из базы данных "
        "(tool:get_treatment_protocols).\n"
        "НИКОГДА не называй конкретные дозы из своих знаний.\n"
        "НИКОГДА не указывай числовые дозировки лекарств.\n"
        "При тяжёлых симптомах (высокая температура, отказ от корма 2+ дня, падёж) — "
        "СРАЗУ предложи эксперта."
    ),
    "zootechnician": (
        "Ты — зоотехник. Помогаешь с управлением стадом, кормлением, "
        "производственным планом.\n"
        "Если фермер говорит о болезни — переключись в ветеринарный режим."
    ),
    "consultant": (
        "Ты — консультант по вопросам ассоциации ТУРАН, субсидиям и документам.\n"
        "Отвечай на основе базы знаний (tool:search_knowledge).\n"
        "Не давай юридических заключений — только информацию и ориентиры."
    ),
    "trading_agent": (
        "Ты — торговый ассистент. Помогаешь создать предложение о продаже скота.\n"
        "КРИТИЧЕСКИ ВАЖНО (ст. 171 ПК РК): НИКОГДА не обсуждай цены других ферм.\n"
        "Справочные цены ТУРАН — только ориентир, не обязательство."
    ),
}

# P-AI-4: This instruction MUST appear in every vet prompt
VET_DOSAGE_PROHIBITION = (
    "\n\nП-AI-4 ПРАВИЛО: НИКОГДА не указывай числовые дозировки лекарств. "
    "Дозировки — ТОЛЬКО из результатов инструмента get_treatment_protocols. "
    "Если инструмент вернул пустой результат — скажи фермеру "
    '"обратитесь к ветеринару лично". '
    "Не генерируй дозировки из своих знаний."
)

# Dok 5 §4.4 R-4: secondary intent hint
SECONDARY_INTENT_HINT = (
    "\nФермер также спросил о {secondary_domain}. "
    "После ответа на основной вопрос — упомяни: "
    '"По поводу {secondary_topic} — напишите /{command}, я помогу с этим отдельно."'
)

SECONDARY_INTENT_MAP = {
    "vet": {"domain": "ветеринарии", "topic": "здоровья животных", "command": "ветеринар"},
    "trading_agent": {"domain": "продажи", "topic": "продажи скота", "command": "продать"},
    "zootechnician": {"domain": "зоотехнии", "topic": "управления стадом", "command": "зоотехник"},
    "consultant": {"domain": "консультации", "topic": "документов и субсидий", "command": "помощь"},
}


def load_system_prompt(role: str, supabase: Client) -> tuple[str, str]:
    """
    Load active prompt from ai_prompts table (D133).
    Returns (content, version).
    Falls back to hardcoded default if DB prompt unavailable.
    """
    try:
        result = supabase.rpc("rpc_get_active_prompt", {"p_role": role}).execute()
        if result.data and len(result.data) > 0:
            row = result.data[0]
            return row["content"], row["version"]
    except Exception as e:
        logger.warning("Failed to load prompt from DB for role=%s: %s", role, e)

    # Fallback to hardcoded
    content = FALLBACK_PROMPTS.get(role, FALLBACK_PROMPTS["base"])
    return content, "fallback-1.0"


def build_system_prompt(
    current_role: str,
    farm_context: dict,
    supabase: Client,
    secondary_intent: Optional[str] = None,
) -> tuple[str, str]:
    """
    Build complete system prompt: base + role-specific.
    Both loaded from DB with version tracking.

    Returns (combined_prompt, combined_version).
    """
    base_content, base_ver = load_system_prompt("base", supabase)
    role_content, role_ver = load_system_prompt(current_role, supabase)

    # Fill base template with farm context
    org = farm_context.get("organization") or {}
    herd_groups = farm_context.get("herd_groups", [])

    try:
        base_filled = base_content.format(
            org_name=org.get("name", "не указана"),
            region=org.get("region", "Казахстан"),
            membership_level=org.get("membership_level", "registered"),
            herd_groups_count=len(herd_groups),
        )
    except (KeyError, IndexError):
        # Template has unexpected placeholders — use as-is
        base_filled = base_content

    combined = base_filled + "\n\n" + role_content

    # P-AI-4: Always append dosage prohibition for vet role
    if current_role == "vet":
        combined += VET_DOSAGE_PROHIBITION

    # R-4: secondary intent hint
    if secondary_intent and secondary_intent in SECONDARY_INTENT_MAP:
        info = SECONDARY_INTENT_MAP[secondary_intent]
        combined += SECONDARY_INTENT_HINT.format(
            secondary_domain=info["domain"],
            secondary_topic=info["topic"],
            command=info["command"],
        )

    # Add active vet cases context for vet role
    if current_role == "vet":
        active_cases = farm_context.get("active_vet_cases", [])
        if active_cases:
            cases_text = "\n".join(
                f"- Кейс {c.get('id', '?')[:8]}...: {c.get('severity', '?')}, "
                f"{c.get('symptoms_text', 'симптомы не указаны')[:100]}"
                for c in active_cases[:5]
            )
            combined += (
                f"\n\nАктивные ветеринарные кейсы ({len(active_cases)}):\n{cases_text}\n"
                "Если симптомы похожи на существующий кейс — дополни его, "
                "а не создавай новый."
            )

    combined_version = f"base={base_ver};role={role_ver}"
    return combined, combined_version
