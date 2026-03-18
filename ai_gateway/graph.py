"""
AgOS AI Gateway — LangGraph Graph Definition

D116: Stateless graph — NO LangGraph checkpointer.
D117: One webhook call = one graph run.
P-AI-7: All state in DB (ai_conversations, ai_messages), not in process memory.

Dok 5 §3.5: Graph node flow.
"""
from typing import TypedDict, Literal, Optional, Any
from datetime import datetime

from langgraph.graph import StateGraph, END


class AgentState(TypedDict):
    """
    Dok 5 §3.2: Graph state schema.
    Loaded from DB at start, saved to DB at end.
    """
    # --- Identity (immutable within run) ---
    conversation_id: str
    user_id: str
    organization_id: str
    channel: Literal["whatsapp", "web"]

    # --- Role ---
    current_role: Literal["zootechnician", "vet", "consultant", "trading_agent"]
    role_was_overridden: bool
    role_override_message_count: int
    secondary_intent: Optional[str]

    # --- Messages ---
    messages: list[dict]  # Claude API format [{role, content, tool_calls?}]
    raw_input: str
    incoming_message_id: str  # WhatsApp wamid for dedup

    # --- Farm Context ---
    farm_context: dict
    active_farm_id: Optional[str]

    # --- Confirmation State (loaded from/saved to AIConversation) ---
    confirmation_pending: bool
    confirmation_payload: Optional[dict]

    # --- Tool execution ---
    tool_calls: list[dict]
    tool_results: list[dict]
    tool_names_used: list[str]

    # --- Response ---
    ai_response: Optional[str]
    prompt_version: Optional[str]

    # --- Control ---
    run_complete: bool
    error: Optional[str]

    # --- Metrics ---
    started_at: str  # ISO datetime
    input_tokens: int
    output_tokens: int


def should_check_confirmation(state: AgentState) -> str:
    """Conditional edge: route based on confirmation_pending flag."""
    if state.get("confirmation_pending"):
        return "confirm_handler"
    return "route_role"


def should_continue_agent_loop(state: AgentState) -> str:
    """Conditional edge after process: are there tool calls to execute?"""
    if state.get("error"):
        return "compliance_filter"
    if state.get("tool_calls"):
        return "execute_tools"
    return "compliance_filter"


def should_loop_after_tools(state: AgentState) -> str:
    """After executing tools, go back to process for Claude to interpret results."""
    return "process"


def build_graph() -> StateGraph:
    """
    Build the LangGraph graph for one webhook call.

    Flow (Dok 5 §3.5):
        load_context -> check_confirmation
            -> [pending=True] confirm_handler -> compliance_filter
            -> [pending=False] route_role -> process
                -> [has tool_calls] execute_tools -> process (loop)
                -> [no tool_calls] compliance_filter
        compliance_filter -> save_response -> END
    """
    from ai_gateway.nodes import (
        load_context_node,
        check_confirmation_node,
        confirm_handler_node,
        route_role_node,
        process_node,
        execute_tools_node,
        compliance_filter_node,
        save_response_node,
    )

    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("load_context", load_context_node)
    graph.add_node("check_confirmation", check_confirmation_node)
    graph.add_node("confirm_handler", confirm_handler_node)
    graph.add_node("route_role", route_role_node)
    graph.add_node("process", process_node)
    graph.add_node("execute_tools", execute_tools_node)
    graph.add_node("compliance_filter", compliance_filter_node)
    graph.add_node("save_response", save_response_node)

    # Set entry point
    graph.set_entry_point("load_context")

    # Edges
    graph.add_edge("load_context", "check_confirmation")

    graph.add_conditional_edges(
        "check_confirmation",
        should_check_confirmation,
        {
            "confirm_handler": "confirm_handler",
            "route_role": "route_role",
        },
    )

    graph.add_edge("confirm_handler", "compliance_filter")
    graph.add_edge("route_role", "process")

    graph.add_conditional_edges(
        "process",
        should_continue_agent_loop,
        {
            "execute_tools": "execute_tools",
            "compliance_filter": "compliance_filter",
        },
    )

    graph.add_edge("execute_tools", "process")
    graph.add_edge("compliance_filter", "save_response")
    graph.add_edge("save_response", END)

    return graph


# D116: No checkpointer — compile without one
_graph = build_graph()
compiled_graph = _graph.compile()
