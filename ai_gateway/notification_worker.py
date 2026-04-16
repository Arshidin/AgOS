"""
AgOS AI Gateway — Notification Worker (Slice 2)

D-S2-2: Minimal WhatsApp + in-app notification sender.
Claims from `notifications` table via claim_pending_notifications (SKIP LOCKED).
Sends WhatsApp messages via Cloud API. Marks sent/failed via RPCs.

This is a subset of the full proactive dispatch (Slice 4).
Handles only the notification delivery path — no AI triggers.

Usage:
    # As standalone worker (cron every 30s):
    python -m ai_gateway.notification_worker

    # As FastAPI endpoint (called by pg_cron or external scheduler):
    POST /notifications/process  (internal API key required)
"""
import logging
import os
import uuid
from typing import Any

import httpx

from ai_gateway.config import get_settings, get_supabase

logger = logging.getLogger("agos.gateway.notifications")

WORKER_ID = f"notif-{uuid.uuid4().hex[:8]}"
BATCH_SIZE = 10

# Dok 4 §5: Notification templates (Russian)
TEMPLATES: dict[str, str] = {
    "application_approved": "Заявка одобрена! Ваш статус: {new_level}. Откройте кабинет.",
    "application_rejected": "Заявка отклонена. Причина: {reject_reason}. Контакт: {contact_info}.",
}


def render_template(template_id: str, params: dict[str, Any]) -> str:
    """Render notification text from template + params."""
    template = TEMPLATES.get(template_id)
    if not template:
        logger.warning("Unknown template_id: %s — using raw params", template_id)
        return f"[{template_id}] {params}"
    try:
        return template.format(**params)
    except KeyError as e:
        logger.error("Template %s missing param: %s", template_id, e)
        return template.format_map({**{k: "" for k in ["new_level", "reject_reason", "contact_info", "org_name"]}, **params})


def send_whatsapp_message(phone: str, text: str, settings: Any) -> bool:
    """
    Send a WhatsApp text message via Cloud API.

    Returns True on success, False on failure.
    Requires WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars.
    """
    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WhatsApp not configured — skipping send to %s", phone[:6] if phone else "?")
        return False

    url = f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": text},
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                logger.info("WhatsApp sent to %s (status=%d)", phone[:6], resp.status_code)
                return True
            else:
                logger.error(
                    "WhatsApp API error: status=%d body=%s",
                    resp.status_code,
                    resp.text[:500],
                )
                return False
    except httpx.TimeoutException:
        logger.error("WhatsApp API timeout for %s", phone[:6] if phone else "?")
        return False
    except Exception as e:
        logger.error("WhatsApp send failed: %s", e, exc_info=True)
        return False


def process_notification_batch() -> dict[str, int]:
    """
    Claim and process a batch of pending notifications.

    Flow:
        claim_pending_notifications(BATCH_SIZE, WORKER_ID)
        → for each notification:
            if channel=whatsapp → send via Cloud API
            if channel=in_app  → mark as sent (UI reads from DB)
        → mark_notification_sent / mark_notification_failed

    Returns: { "claimed": N, "sent": N, "failed": N }
    """
    supabase = get_supabase()
    settings = get_settings()

    # 1. Claim batch (SKIP LOCKED — L-NEW-2)
    try:
        result = supabase.rpc("claim_pending_notifications", {
            "p_batch_size": BATCH_SIZE,
            "p_worker_id": WORKER_ID,
        }).execute()
    except Exception as e:
        logger.error("claim_pending_notifications failed: %s", e)
        return {"claimed": 0, "sent": 0, "failed": 0}

    notifications = result.data or []
    if not notifications:
        return {"claimed": 0, "sent": 0, "failed": 0}

    logger.info("Claimed %d notifications (worker=%s)", len(notifications), WORKER_ID)

    sent = 0
    failed = 0

    for notif in notifications:
        notif_id = notif["id"]
        channel = notif["channel"]
        template_id = notif["template_id"]
        params = notif.get("params") or {}
        user_id = notif["user_id"]

        try:
            # Render message text
            text = render_template(template_id, params)

            if channel == "whatsapp":
                # Look up user phone
                phone = _get_user_phone(supabase, user_id)
                if not phone:
                    _mark_failed(supabase, notif_id, "NO_PHONE: user has no phone number")
                    failed += 1
                    continue

                success = send_whatsapp_message(phone, text, settings)
                if success:
                    _mark_sent(supabase, notif_id)
                    sent += 1
                else:
                    _mark_failed(supabase, notif_id, "WHATSAPP_API_ERROR")
                    failed += 1

            elif channel == "in_app":
                # In-app notifications are "sent" immediately — UI reads from DB
                _mark_sent(supabase, notif_id)
                sent += 1

            else:
                _mark_failed(supabase, notif_id, f"UNKNOWN_CHANNEL: {channel}")
                failed += 1

        except Exception as e:
            logger.error("Failed to process notification %s: %s", notif_id, e, exc_info=True)
            _mark_failed(supabase, notif_id, str(e)[:500])
            failed += 1

    logger.info("Batch done: claimed=%d sent=%d failed=%d", len(notifications), sent, failed)
    return {"claimed": len(notifications), "sent": sent, "failed": failed}


def _get_user_phone(supabase, user_id: str) -> str | None:
    """Look up user phone from users table."""
    try:
        result = supabase.table("users").select("phone").eq("id", user_id).single().execute()
        return result.data.get("phone") if result.data else None
    except Exception as e:
        logger.error("Failed to get phone for user %s: %s", user_id[:8], e)
        return None


def _mark_sent(supabase, notif_id: str) -> None:
    """Mark notification as sent via RPC."""
    try:
        supabase.rpc("mark_notification_sent", {"p_notification_id": notif_id}).execute()
    except Exception as e:
        logger.error("mark_notification_sent failed for %s: %s", notif_id[:8], e)


def _mark_failed(supabase, notif_id: str, error: str) -> None:
    """Mark notification as failed via RPC (with retry logic in DB)."""
    try:
        supabase.rpc("mark_notification_failed", {
            "p_notification_id": notif_id,
            "p_error": error,
        }).execute()
    except Exception as e:
        logger.error("mark_notification_failed failed for %s: %s", notif_id[:8], e)


# ─── TAXONOMY-M3b: platform_event handler skeleton ──────────────────────────
# Dok 4 §3.9: standards.animal_category.updated → invalidate taxonomy caches
# in both ai_gateway (this process) and consulting_engine (separate process).
#
# Full wiring (S4-DB / Slice 4 proactive dispatch):
#   1. Poll platform_events WHERE event_type = 'standards.animal_category.updated'
#      AND processed_at IS NULL (SKIP LOCKED per L-NEW-2)
#   2. Call handle_platform_event for each row
#   3. Mark row processed
#
# For now: the handler is wired; the polling loop is deferred to Slice 4.
# Consulting_engine invalidation is cross-process — needs HTTP call or shared
# cache (Redis) when both run as separate services. Current stub logs the intent.

def handle_platform_event(event_type: str, payload: dict) -> None:
    """Dispatch a platform_events row to the appropriate handler.

    Called from future polling loop (Slice 4 proactive dispatch).
    Currently only wires taxonomy cache invalidation.
    """
    if event_type == "standards.animal_category.updated":
        _handle_taxonomy_updated(payload)
    # Other event types handled in Slice 4


def _handle_taxonomy_updated(payload: dict) -> None:
    """Invalidate in-process L1 taxonomy cache on standards.animal_category.updated.

    ai_gateway.taxonomy._cache holds the L1 code list for tool schemas.
    After invalidation, next call to get_l1_codes() re-fetches from DB.
    """
    try:
        from ai_gateway.taxonomy import invalidate_l1
        invalidate_l1()
        logger.info(
            "taxonomy_updated: L1 cache invalidated (action=%s, code=%s)",
            payload.get("action", "?"),
            payload.get("code", "?"),
        )
    except Exception as exc:
        logger.error("taxonomy_updated: invalidate_l1 failed: %s", exc)

    # Consulting_engine runs in a separate process — its TaxonomyCache must be
    # invalidated via an HTTP call to /internal/taxonomy/invalidate or a shared
    # Redis key. Deferred to Slice 4 when service mesh is defined.
    logger.debug("taxonomy_updated: consulting_engine invalidation deferred to Slice 4")


# --- Standalone runner ---
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    result = process_notification_batch()
    print(f"Result: {result}")
