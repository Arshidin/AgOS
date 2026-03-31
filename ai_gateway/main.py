"""
AgOS AI Gateway — FastAPI Application

Dok 5 §12: Endpoints.
D117: One webhook call = one graph run.
P-AI-8: Save incoming message BEFORE processing.

Slice 1: /chat endpoint with LangGraph graph + vet tools.
"""
import logging
import time
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from ai_gateway.config import get_settings, get_supabase
from ai_gateway.graph import compiled_graph

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agos.gateway")

app = FastAPI(title="AgOS AI Gateway", version="0.4.0-slice4")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    settings = get_settings()
    missing = settings.validate()
    status = "ok" if not missing else "degraded"
    return {
        "status": status,
        "version": "0.2.0-slice1",
        "missing_env": missing if missing else None,
    }


@app.post("/chat")
async def chat(request: Request):
    """
    Main chat endpoint. Handles both WhatsApp webhooks and web cabinet requests.

    Dok 5 §3.3: One webhook call = one LangGraph graph run (D117).
    P-AI-8: User message saved FIRST before processing.

    Expected body:
    {
        "organization_id": "uuid",
        "user_message": "text",
        "conversation_id": "uuid" (optional — will create/reuse),
        "farm_id": "uuid" (optional),
        "phone": "string" (optional — for WhatsApp user resolution),
        "whatsapp_message_id": "string" (optional — for dedup),
        "channel": "whatsapp" | "web"
    }
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # --- Validate required fields ---
    organization_id = body.get("organization_id")
    user_message = body.get("user_message", "").strip()

    if not organization_id:
        raise HTTPException(status_code=400, detail="organization_id required")
    if not user_message:
        raise HTTPException(status_code=400, detail="user_message required")

    supabase = get_supabase()
    started_at = datetime.now(timezone.utc).isoformat()

    # --- Step 1: Get or create conversation ---
    conversation_id = body.get("conversation_id")
    farm_id = body.get("farm_id")
    phone = body.get("phone")
    channel = body.get("channel", "whatsapp")

    if not conversation_id:
        # Create/reuse conversation via RPC-40
        try:
            conv_result = supabase.rpc("rpc_start_ai_conversation", {
                "p_organization_id": organization_id,
                "p_farm_id": farm_id,
                "p_phone": phone,
                "p_language": "ru",
            }).execute()
            conv_data = conv_result.data
            conversation_id = conv_data.get("conv_id")
            if not conversation_id:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create conversation"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("rpc_start_ai_conversation failed: %s", e, exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to start conversation: {e}"
            )

    # --- Step 2: P-AI-8 — Save user message BEFORE processing ---
    whatsapp_message_id = body.get("whatsapp_message_id", f"web_{int(time.time()*1000)}")

    try:
        dedup_result = supabase.rpc("insert_user_message_dedup", {
            "p_conversation_id": conversation_id,
            "p_content": user_message,
            "p_whatsapp_message_id": whatsapp_message_id,
        }).execute()

        dedup_data = dedup_result.data
        if not dedup_data.get("is_new"):
            # Duplicate message (WhatsApp retry) — return early
            logger.info("Duplicate message detected: wamid=%s", whatsapp_message_id)
            return JSONResponse({
                "status": "duplicate",
                "conversation_id": conversation_id,
            })
    except Exception as e:
        logger.error("insert_user_message_dedup failed: %s", e, exc_info=True)
        # P-AI-8: If we can't save the message, we still try to process
        # but log it as critical
        logger.critical("P-AI-8 VIOLATION: user message not saved before processing")

    # --- Step 3: Run LangGraph graph (D117: one run per webhook call) ---
    initial_state = {
        "conversation_id": conversation_id,
        "user_id": "",  # Resolved inside the graph from conversation
        "organization_id": organization_id,
        "channel": channel,
        "current_role": "consultant",  # Will be overridden by load_context / route_role
        "role_was_overridden": False,
        "role_override_message_count": 0,
        "secondary_intent": None,
        "messages": [],
        "raw_input": user_message,
        "incoming_message_id": whatsapp_message_id,
        "farm_context": {},
        "active_farm_id": farm_id,
        "confirmation_pending": False,
        "confirmation_payload": None,
        "tool_calls": [],
        "tool_results": [],
        "tool_names_used": [],
        "ai_response": None,
        "prompt_version": None,
        "run_complete": False,
        "error": None,
        "started_at": started_at,
        "input_tokens": 0,
        "output_tokens": 0,
    }

    try:
        # D116: Stateless graph — no checkpointer
        # D117: One graph.invoke() per webhook call
        final_state = compiled_graph.invoke(initial_state)
    except Exception as e:
        logger.error("Graph execution failed: %s", e, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "conversation_id": conversation_id,
                "response": "Произошла ошибка. Попробуйте ещё раз.",
                "error": str(e),
            },
        )

    # --- Step 4: Return response ---
    ai_response = final_state.get("ai_response", "")
    error = final_state.get("error")

    return JSONResponse({
        "status": "ok" if not error else "error",
        "conversation_id": conversation_id,
        "response": ai_response,
        "role": final_state.get("current_role", "consultant"),
        "error": error,
    })


@app.post("/notifications/process")
async def process_notifications(request: Request):
    """
    D-S2-2: Process pending notifications (WhatsApp + in-app).
    Called by pg_cron or external scheduler every 30s.
    Requires INTERNAL_API_KEY header for security.
    """
    from ai_gateway.notification_worker import process_notification_batch

    settings = get_settings()
    if settings.INTERNAL_API_KEY:
        api_key = request.headers.get("x-api-key", "")
        if api_key != settings.INTERNAL_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

    result = process_notification_batch()
    return {"status": "ok", **result}


@app.post("/proactive/dispatch")
async def proactive_dispatch(request: Request):
    """
    Dok 5 §12: pg_cron consumer endpoint.
    L-NEW-2: SKIP LOCKED batch processing (NOT advisory locks).
    Called by pg_cron every 5 minutes via net.http_post.
    Requires INTERNAL_API_KEY header.
    """
    from ai_gateway.notification_worker import process_notification_batch

    settings = get_settings()
    if settings.INTERNAL_API_KEY:
        api_key = request.headers.get("x-api-key", "") or request.headers.get("authorization", "").removeprefix("Bearer ")
        if api_key != settings.INTERNAL_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

    # L-NEW-2: No advisory lock — SKIP LOCKED in claim_pending_notifications
    # is the real concurrency protection. Two instances both call claim,
    # which uses FOR UPDATE SKIP LOCKED — they get different batches.
    result = process_notification_batch()
    return {"status": "ok", **result}
