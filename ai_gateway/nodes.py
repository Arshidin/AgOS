"""
AgOS AI Gateway — Graph Node Implementations

Dok 5 §3.5: Each node is a function that transforms AgentState.
P-AI-7: Stateless — all persistent state in DB.
P-AI-1: All writes through supabase.rpc().
"""
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

import anthropic

from ai_gateway.config import get_settings, get_supabase
from ai_gateway.compliance import run_compliance_filter
from ai_gateway.prompts import build_system_prompt
from ai_gateway.tools.vet import VET_TOOL_DEFINITIONS, execute_vet_tool
from ai_gateway.tools.feed import FEED_TOOL_DEFINITIONS, execute_feed_tool
from ai_gateway.tools.ops import OPS_TOOL_DEFINITIONS, execute_ops_tool

logger = logging.getLogger("agos.gateway.nodes")

settings = get_settings()

# --------------------------------------------------------------------------
# Role detection (Dok 5 §4.3)
# --------------------------------------------------------------------------
ROLE_SIGNALS = {
    "vet": {
        "ru": [
            "кашляет", "хромает", "понос", "температура", "болезнь",
            "вакцин", "лечени", "симптом", "пал", "пало", "заболел",
            "вздутие", "аборт", "роды", "теленок не встает", "не ест",
            "слезится", "хрипит", "падёж", "больн", "болен",
        ],
        "kk": [
            "жөтеледі", "ақсайды", "іші кетеді", "қызуы бар",
            "ауырады", "өлді", "егу", "дәрі", "туды",
        ],
    },
    "trading_agent": {
        "ru": [
            "продать", "продаю", "цена", "покупатель", "сколько стоит",
            "мясокомбинат", "батч", "партия", "живой вес", "сдать",
            "реализовать", "покупают",
        ],
        "kk": ["сатамын", "баға", "сатып алушы", "тірі салмақ"],
    },
    "zootechnician": {
        "ru": [
            "корм", "кормлен", "рацион", "сено", "силос", "ячмен",
            "пшениц", "зерно", "запас", "стадо", "поголов",
            "группа", "бычк", "телк", "нетел", "откорм",
            "кг корм", "тонн", "сколько корм", "чем кормить",
            "рассчитать", "бюджет", "дефицит",
        ],
        "kk": [
            "жем", "азық", "рацион", "шөп", "арпа", "бидай",
            "мал", "бас", "топ",
        ],
    },
    "consultant": {
        "ru": [
            "субсиди", "документ", "членство", "закон", "справка",
            "ИСЖ", "регистрация", "ЛПХ", "КФХ", "господдержка", "грант",
        ],
        "kk": ["субсидия", "құжат", "мүшелік", "тіркеу"],
    },
}

# Explicit command overrides (Dok 5 §4.4)
ROLE_COMMANDS = {
    "/зоотехник": "zootechnician",
    "/ветеринар": "vet",
    "/продать": "trading_agent",
    "/помощь": "consultant",
}

# Tool definitions per role (Dok 5 §6.6)
TOOLS_BY_ROLE = {
    "vet": VET_TOOL_DEFINITIONS,
    # Slice 1 scope: only vet tools implemented.
    # Other roles get no tools for now (general conversation only).
    "zootechnician": FEED_TOOL_DEFINITIONS + OPS_TOOL_DEFINITIONS,
    "consultant": [],
    "trading_agent": [],
}

# Language detection (Dok 5 §9.2 L-3)
KK_MARKERS = ["мен", "сен", "бар", "жоқ", "қажет", "болады", "үшін"]


def detect_language_pure(text: str) -> str:
    """Detect language without DB write. Safe for error handlers (L-3)."""
    return "kk" if any(m in text.lower() for m in KK_MARKERS) else "ru"


def detect_role(text: str, current_role: str) -> str:
    """Dok 5 §4.3: Auto-detect role from message signals."""
    text_lower = text.lower()
    for role, langs in ROLE_SIGNALS.items():
        all_signals = langs.get("ru", []) + langs.get("kk", [])
        if any(s in text_lower for s in all_signals):
            return role
    return current_role


def detect_intents(text: str) -> dict:
    """R-4: Detect primary_role + secondary_intent."""
    text_lower = text.lower()
    found_roles = []
    for role, langs in ROLE_SIGNALS.items():
        all_signals = langs.get("ru", []) + langs.get("kk", [])
        if any(s in text_lower for s in all_signals):
            found_roles.append(role)
    return {
        "primary_role": found_roles[0] if found_roles else None,
        "secondary_intent": found_roles[1] if len(found_roles) > 1 else None,
    }


# --------------------------------------------------------------------------
# Error responses (Dok 5 §11)
# --------------------------------------------------------------------------
ERROR_RESPONSES = {
    "claude_timeout": {
        "ru": "Сейчас не могу ответить — попробуйте через минуту.",
        "kk": "Қазір жауап бере алмаймын — бір минуттан кейін қайталаңыз.",
    },
    "rpc_constraint": {
        "ru": "Это действие недоступно при вашем уровне членства. Свяжитесь с менеджером ТУРАН.",
        "kk": "Бұл әрекет сіздің мүшелік деңгейіңізде қол жетімді емес.",
    },
    "supabase_unavailable": {
        "ru": "Система временно недоступна. Ваше сообщение сохранено и будет обработано.",
        "kk": "Жүйе уақытша қол жетімді емес.",
    },
}


# --------------------------------------------------------------------------
# Node: load_context
# --------------------------------------------------------------------------
def load_context_node(state: dict) -> dict:
    """
    Load farm context via rpc_get_ai_farm_context.
    Also load conversation state (confirmation_pending, etc).
    """
    supabase = get_supabase()
    org_id = state["organization_id"]
    farm_id = state.get("active_farm_id")

    try:
        # Load farm context
        ctx_params = {"p_organization_id": org_id}
        if farm_id:
            ctx_params["p_farm_id"] = farm_id
        result = supabase.rpc("rpc_get_ai_farm_context", ctx_params).execute()
        farm_context = result.data or {}

        # Auto-resolve farm_id from context if not set
        if not farm_id and farm_context.get("farm_id"):
            farm_id = farm_context["farm_id"]

        # Load conversation state for confirmation flow
        conv_id = state["conversation_id"]
        conv_result = (
            supabase.table("ai_conversations")
            .select("confirmation_pending, confirmation_payload, current_role, "
                    "role_was_overridden, message_history_summary, detected_language")
            .eq("id", conv_id)
            .single()
            .execute()
        )
        conv_data = conv_result.data or {}

        return {
            "farm_context": farm_context,
            "active_farm_id": farm_id,
            "confirmation_pending": conv_data.get("confirmation_pending", False),
            "confirmation_payload": conv_data.get("confirmation_payload"),
            "current_role": conv_data.get("current_role", state.get("current_role", "consultant")),
            "role_was_overridden": conv_data.get("role_was_overridden", False),
        }
    except Exception as e:
        logger.error("load_context failed: %s", e, exc_info=True)
        lang = detect_language_pure(state.get("raw_input", ""))
        return {
            "farm_context": {},
            "error": ERROR_RESPONSES["supabase_unavailable"].get(lang, ""),
            "ai_response": ERROR_RESPONSES["supabase_unavailable"].get(lang, ""),
            "run_complete": True,
        }


# --------------------------------------------------------------------------
# Node: check_confirmation
# --------------------------------------------------------------------------
def check_confirmation_node(state: dict) -> dict:
    """
    Dok 5 §3.4: Check if there is a pending confirmation.
    Returns state unchanged — routing handled by conditional edge.
    """
    # State already has confirmation_pending from load_context
    return {}


# --------------------------------------------------------------------------
# Node: confirm_handler
# --------------------------------------------------------------------------
def confirm_handler_node(state: dict) -> dict:
    """
    Dok 5 §3.4 / R-3: Parse farmer's confirmation response using Claude Haiku.
    Handles: confirm / reject / amend / unclear.
    """
    supabase = get_supabase()
    raw_input = state.get("raw_input", "")
    payload = state.get("confirmation_payload", {})

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        prompt = (
            "Фермер отвечает на вопрос о записи данных.\n\n"
            f"Что предлагалось записать:\n{json.dumps(payload, ensure_ascii=False, indent=2)}\n\n"
            f'Ответ фермера: "{raw_input}"\n\n'
            "Определи намерение:\n"
            '- "confirm": фермер согласен записать данные как есть\n'
            '- "reject": фермер отказывается, данные не нужно записывать\n'
            '- "amend": фермер согласен, но хочет изменить некоторые данные\n\n'
            'Если "amend" — укажи какие поля нужно изменить в amended_data.\n\n'
            "Отвечай ТОЛЬКО валидным JSON без пояснений:\n"
            '{"action": "confirm"|"reject"|"amend", "amended_data": {...} или null}'
        )

        response = client.messages.create(
            model=settings.CLAUDE_HAIKU_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            parsed = json.loads(response.content[0].text)
        except (json.JSONDecodeError, IndexError):
            parsed = {"action": "unclear", "amended_data": None}

        action = parsed.get("action", "unclear")

        if action == "confirm":
            # Execute the pending write
            return _execute_confirmation_write(state, payload, supabase)

        elif action == "amend":
            amended = parsed.get("amended_data") or {}
            merged = {**payload.get("data", {}), **amended}
            new_payload = {**payload, "data": merged}
            # Save updated payload
            supabase.rpc("rpc_update_confirmation_payload", {
                "p_conversation_id": state["conversation_id"],
                "p_organization_id": state["organization_id"],
                "p_payload": new_payload,
            }).execute()
            # Format confirmation question
            data_str = "\n".join(f"  {k}: {v}" for k, v in merged.items())
            return {
                "ai_response": f"Обновлённые данные:\n{data_str}\n\nЗаписать? (Да/Нет)",
                "confirmation_payload": new_payload,
                "tool_calls": [],
                "tool_results": [],
            }

        elif action == "reject":
            # Clear confirmation
            _clear_confirmation(state["conversation_id"], state["organization_id"], supabase)
            return {
                "ai_response": "Понял, отменяю. Что нужно изменить?",
                "confirmation_pending": False,
                "confirmation_payload": None,
                "tool_calls": [],
                "tool_results": [],
            }

        else:  # unclear
            return {
                "ai_response": "Не совсем понял. Записать данные? Ответьте Да или Нет.",
                "tool_calls": [],
                "tool_results": [],
            }

    except Exception as e:
        logger.error("confirm_handler failed: %s", e, exc_info=True)
        return {
            "ai_response": "Произошла ошибка. Пожалуйста, попробуйте ещё раз.",
            "error": str(e),
            "tool_calls": [],
            "tool_results": [],
        }


def _execute_confirmation_write(state: dict, payload: dict, supabase) -> dict:
    """Execute the RPC call from confirmation payload."""
    rpc_name = payload.get("rpc")
    data = payload.get("data", {})
    org_id = state["organization_id"]

    if not rpc_name:
        return {"ai_response": "Ошибка: не указан RPC для записи.", "error": "no_rpc_in_payload"}

    try:
        # Inject organization_id (P-AI-2)
        rpc_params = {"p_organization_id": org_id, **data}
        result = supabase.rpc(rpc_name, rpc_params).execute()

        # Clear confirmation after successful write
        _clear_confirmation(state["conversation_id"], org_id, supabase)

        entity_type = payload.get("entity_type", "данные")
        return {
            "ai_response": f"Записано. {entity_type} успешно сохранены.",
            "confirmation_pending": False,
            "confirmation_payload": None,
            "tool_calls": [],
            "tool_results": [{"rpc": rpc_name, "result": result.data}],
        }
    except Exception as e:
        logger.error("Confirmation write failed: rpc=%s error=%s", rpc_name, e)
        return {"ai_response": f"Ошибка при записи: {e}", "error": str(e)}


def _clear_confirmation(conversation_id: str, org_id: str, supabase) -> None:
    """Clear confirmation state in DB."""
    try:
        supabase.table("ai_conversations").update({
            "confirmation_pending": False,
            "confirmation_payload": None,
        }).eq("id", conversation_id).execute()
    except Exception as e:
        logger.error("Failed to clear confirmation: %s", e)


# --------------------------------------------------------------------------
# Node: route_role
# --------------------------------------------------------------------------
def route_role_node(state: dict) -> dict:
    """
    Dok 5 §4.3-4.4: Determine which role to use.
    Explicit commands > auto-detection > current role.
    R-4: Override timeout after N messages.
    """
    raw_input = state.get("raw_input", "")
    current_role = state.get("current_role", "consultant")
    was_overridden = state.get("role_was_overridden", False)

    # Check explicit command
    text_stripped = raw_input.strip().lower()
    for cmd, role in ROLE_COMMANDS.items():
        if text_stripped.startswith(cmd):
            return {
                "current_role": role,
                "role_was_overridden": True,
                "role_override_message_count": 0,
            }

    # R-4: Check override timeout
    if was_overridden:
        msg_count = state.get("role_override_message_count", 0) + 1
        if msg_count >= settings.ROLE_OVERRIDE_TIMEOUT_MESSAGES:
            was_overridden = False

    # Auto-detect if not manually overridden
    if not was_overridden:
        intents = detect_intents(raw_input)
        if intents["primary_role"]:
            return {
                "current_role": intents["primary_role"],
                "secondary_intent": intents.get("secondary_intent"),
                "role_was_overridden": False,
            }

    return {
        "role_override_message_count": state.get("role_override_message_count", 0) + 1,
    }


# --------------------------------------------------------------------------
# Node: process
# --------------------------------------------------------------------------
def process_node(state: dict) -> dict:
    """
    Call Claude API with system prompt + farm context + message history + tools.
    """
    supabase = get_supabase()
    current_role = state.get("current_role", "vet")
    farm_context = state.get("farm_context", {})
    raw_input = state.get("raw_input", "")
    tool_results = state.get("tool_results", [])

    try:
        # Build system prompt
        system_prompt, prompt_version = build_system_prompt(
            current_role=current_role,
            farm_context=farm_context,
            supabase=supabase,
            secondary_intent=state.get("secondary_intent"),
        )

        # Build messages
        messages = _build_messages(state, tool_results)

        # Get tools for this role
        tools = TOOLS_BY_ROLE.get(current_role, [])

        # Call Claude
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        api_kwargs = {
            "model": settings.CLAUDE_MODEL,
            "max_tokens": 1024,
            "system": system_prompt,
            "messages": messages,
        }
        if tools:
            api_kwargs["tools"] = tools

        start_time = time.time()
        response = client.messages.create(**api_kwargs)
        latency_ms = int((time.time() - start_time) * 1000)

        # Parse response
        ai_text = ""
        new_tool_calls = []

        for block in response.content:
            if block.type == "text":
                ai_text += block.text
            elif block.type == "tool_use":
                new_tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        return {
            "ai_response": ai_text if ai_text else None,
            "tool_calls": new_tool_calls,
            "prompt_version": prompt_version,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }

    except anthropic.APITimeoutError:
        lang = detect_language_pure(raw_input)
        return {
            "ai_response": ERROR_RESPONSES["claude_timeout"].get(lang, ""),
            "error": "claude_timeout",
            "tool_calls": [],
        }
    except anthropic.APIError as e:
        logger.error("Claude API error: %s", e, exc_info=True)
        lang = detect_language_pure(raw_input)
        return {
            "ai_response": ERROR_RESPONSES["claude_timeout"].get(lang, ""),
            "error": f"claude_error: {e}",
            "tool_calls": [],
        }
    except Exception as e:
        logger.error("process_node failed: %s", e, exc_info=True)
        return {
            "ai_response": "Произошла ошибка. Попробуйте ещё раз.",
            "error": str(e),
            "tool_calls": [],
        }


def _build_messages(state: dict, tool_results: list) -> list[dict]:
    """
    Build Claude API messages array.
    Includes message history + current input + tool results.
    """
    messages = []

    # Add existing message history (loaded from DB)
    history = state.get("messages", [])
    if history:
        messages.extend(history)

    # If we have tool results from previous iteration, add them
    if tool_results:
        # The last message should be assistant with tool_use blocks
        # Add tool results
        for tr in tool_results:
            messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tr.get("tool_call_id", ""),
                        "content": json.dumps(tr.get("result", {}), ensure_ascii=False),
                    }
                ],
            })
    else:
        # First iteration — add user message
        raw_input = state.get("raw_input", "")
        if raw_input:
            messages.append({"role": "user", "content": raw_input})

    return messages if messages else [{"role": "user", "content": state.get("raw_input", "")}]


# --------------------------------------------------------------------------
# Node: execute_tools
# --------------------------------------------------------------------------
def execute_tools_node(state: dict) -> dict:
    """
    Execute tool calls from Claude's response via supabase.rpc().
    P-AI-1: All writes through RPC.
    P-AI-2: organization_id injected from state, not from LLM.
    """
    supabase = get_supabase()
    org_id = state["organization_id"]
    tool_calls = state.get("tool_calls", [])
    tool_names_used = list(state.get("tool_names_used", []))
    all_results = []

    for tc in tool_calls:
        tool_name = tc["name"]
        tool_input = tc["input"]
        tool_call_id = tc["id"]
        tool_names_used.append(tool_name)

        logger.info("Executing tool: %s (org=%s)", tool_name, org_id[:8])

        # Dispatch to appropriate tool module
        # Vet tools (Slice 1)
        if tool_name in ("create_vet_case", "add_symptoms", "get_diagnosis", "get_treatment_protocols"):
            result = execute_vet_tool(
                tool_name=tool_name,
                tool_input=tool_input,
                organization_id=org_id,
                supabase=supabase,
            )
        # Feed tools (Slice 3)
        elif tool_name in ("get_feeding_plan", "get_farm_summary", "get_current_ration",
                           "update_feed_inventory", "log_herd_event"):
            result = execute_feed_tool(
                tool_name=tool_name,
                tool_input=tool_input,
                organization_id=org_id,
                supabase=supabase,
            )
        # Ops tools (Slice 4)
        elif tool_name in ("get_farm_tasks", "complete_farm_task",
                           "get_production_plan", "get_active_plan"):
            result = execute_ops_tool(
                tool_name=tool_name,
                tool_input=tool_input,
                organization_id=org_id,
                supabase=supabase,
            )
        else:
            result = {"error": f"Tool '{tool_name}' not implemented"}
            logger.warning("Unimplemented tool called: %s", tool_name)

        all_results.append({
            "tool_call_id": tool_call_id,
            "tool_name": tool_name,
            "result": result,
        })

    # Build messages that include tool results for next process iteration
    # We need to reconstruct the assistant message with tool_use blocks
    # and the user message with tool_result blocks
    assistant_content = []
    if state.get("ai_response"):
        assistant_content.append({"type": "text", "text": state["ai_response"]})
    for tc in tool_calls:
        assistant_content.append({
            "type": "tool_use",
            "id": tc["id"],
            "name": tc["name"],
            "input": tc["input"],
        })

    updated_messages = list(state.get("messages", []))
    # Add current user message if not already there
    if not updated_messages or updated_messages[-1].get("role") != "user":
        updated_messages.append({"role": "user", "content": state.get("raw_input", "")})

    # Add assistant response with tool_use
    updated_messages.append({"role": "assistant", "content": assistant_content})

    # Add tool results as user messages
    tool_result_content = []
    for tr in all_results:
        tool_result_content.append({
            "type": "tool_result",
            "tool_use_id": tr["tool_call_id"],
            "content": json.dumps(tr.get("result", {}), ensure_ascii=False, default=str),
        })
    updated_messages.append({"role": "user", "content": tool_result_content})

    return {
        "messages": updated_messages,
        "tool_calls": [],  # Clear so process doesn't loop infinitely
        "tool_results": all_results,
        "tool_names_used": tool_names_used,
        "ai_response": None,  # Clear — process will generate new response
    }


# --------------------------------------------------------------------------
# Node: compliance_filter
# --------------------------------------------------------------------------
def compliance_filter_node(state: dict) -> dict:
    """
    Dok 5 §8: Run compliance filter on AI response.
    P-AI-4: No numeric dosages.
    P-AI-5: Every response passes through this filter.
    """
    response_text = state.get("ai_response", "")
    if not response_text:
        return {}

    tool_names = state.get("tool_names_used", [])
    is_clean, filtered_text = run_compliance_filter(response_text, tool_names)

    if not is_clean:
        logger.warning("Compliance filter modified response for conv=%s",
                        state.get("conversation_id", "?")[:8])

    return {"ai_response": filtered_text}


# --------------------------------------------------------------------------
# Node: save_response
# --------------------------------------------------------------------------
def save_response_node(state: dict) -> dict:
    """
    Save AI response to DB via insert_ai_message RPC.
    Also sync role to AIConversation.
    """
    supabase = get_supabase()
    conv_id = state.get("conversation_id")
    response_text = state.get("ai_response", "")

    if not conv_id or not response_text:
        return {"run_complete": True}

    try:
        # Save assistant message via RPC (P-AI-1)
        supabase.rpc("insert_ai_message", {
            "p_conversation_id": conv_id,
            "p_role": "assistant",
            "p_content_text": response_text,
            "p_tool_calls": state.get("tool_results") if state.get("tool_results") else None,
            "p_model_used": settings.CLAUDE_MODEL,
            "p_input_tokens": state.get("input_tokens", 0),
            "p_output_tokens": state.get("output_tokens", 0),
            "p_prompt_version": state.get("prompt_version"),
        }).execute()

        # Sync current role to conversation (Dok 5 §3.5 O-3)
        supabase.table("ai_conversations").update({
            "current_role": state.get("current_role", "consultant"),
        }).eq("id", conv_id).execute()

    except Exception as e:
        logger.error("save_response failed: %s", e, exc_info=True)

    return {"run_complete": True}
