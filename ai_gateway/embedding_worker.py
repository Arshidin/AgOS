"""
AgOS AI Gateway — Embedding Worker (Dok 5 §15, D-4 fix)

Consumes embedding_queue (d07_ai_gateway.sql):
  pending → claim_embedding_batch → Embeddings API → complete_embedding_job → done
                                                    ↘ fail_embedding_job → retry/failed_permanent

SQL FSM (d07):
  - embedding_queue.status: pending → processing → done | failed → failed_permanent
  - retry_count < max_retries (3): failed → pending (retry)
  - retry_count >= max_retries: failed → failed_permanent

Concurrency: FOR UPDATE SKIP LOCKED in claim_embedding_batch — multiple instances
safe without advisory locks (L-NEW-2).

Provider: EMBEDDING_PROVIDER env var
  - "voyage"  (default, Dok 5 §15 spec): voyageai.AsyncClient, voyage-3 model, dim=1536
  - "openai"  (fallback): text-embedding-3-small via httpx, dim=1536

Integration: started as asyncio.Task in FastAPI lifespan (main.py).
Also triggerable via POST /embeddings/process (for testing / manual backfill).

Usage:
    # Automatic (lifespan):
    task = asyncio.create_task(embedding_worker_loop(supabase), name="embedding_worker")

    # Manual cycle:
    result = await run_embedding_cycle(supabase)
"""
import asyncio
import logging
import os
import uuid

import httpx

from ai_gateway.config import get_settings

logger = logging.getLogger("agos.embedding_worker")

# Stable worker ID per process — used in claim_embedding_batch for traceability
WORKER_ID = f"ew-{os.environ.get('HOSTNAME', uuid.uuid4().hex[:8])}"


# ─── Embedding API ─────────────────────────────────────────────────────────────


async def get_embedding(text: str) -> list[float]:
    """
    Generate a 1536-dim embedding vector for text.

    Provider selection via EMBEDDING_PROVIDER env var:
      - "voyage"  → voyageai.AsyncClient, model voyage-3 (Dok 5 §15 default)
      - "openai"  → text-embedding-3-small via httpx (fallback)

    Both produce vector(1536) compatible with the HNSW index in knowledge_chunks.
    """
    settings = get_settings()
    provider = settings.EMBEDDING_PROVIDER.lower()

    if provider == "voyage":
        return await _get_embedding_voyage(text, settings.VOYAGE_API_KEY)
    elif provider == "openai":
        return await _get_embedding_openai(text, settings.OPENAI_API_KEY)
    else:
        raise ValueError(
            f"Unknown EMBEDDING_PROVIDER='{provider}'. Use 'voyage' or 'openai'."
        )


async def _get_embedding_voyage(text: str, api_key: str) -> list[float]:
    """Voyage AI — primary provider per Dok 5 §15. voyage-3 model, dim=1536."""
    if not api_key:
        raise RuntimeError(
            "VOYAGE_API_KEY not set. Set VOYAGE_API_KEY env var or "
            "switch to EMBEDDING_PROVIDER=openai with OPENAI_API_KEY."
        )
    try:
        import voyageai  # type: ignore[import]
    except ImportError:
        raise RuntimeError(
            "voyageai library not installed. Run: pip install voyageai\n"
            "Alternatively set EMBEDDING_PROVIDER=openai."
        )

    client = voyageai.AsyncClient(api_key=api_key)
    result = await client.embed([text], model="voyage-3")
    return result.embeddings[0]


async def _get_embedding_openai(text: str, api_key: str) -> list[float]:
    """OpenAI text-embedding-3-small — fallback, dim=1536, httpx implementation."""
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY not set. Set OPENAI_API_KEY env var or "
            "switch to EMBEDDING_PROVIDER=voyage with VOYAGE_API_KEY."
        )

    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "text-embedding-3-small",
        "input": text,
        "dimensions": 1536,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(
                f"OpenAI Embeddings API error: {resp.status_code} — {resp.text[:300]}"
            )
        data = resp.json()
        return data["data"][0]["embedding"]


# ─── Worker Cycle ──────────────────────────────────────────────────────────────


async def run_embedding_cycle(supabase) -> dict:
    """
    One embedding cycle: claim batch → vectorize → complete/fail.

    Returns: {"claimed": N, "completed": N, "failed": N, "permanent_failures": N}
    """
    settings = get_settings()

    # 1. Claim batch (FOR UPDATE SKIP LOCKED — L-NEW-2)
    try:
        batch_result = supabase.rpc(
            "claim_embedding_batch",
            {
                "p_batch_size": settings.EMBEDDING_BATCH_SIZE,
                "p_worker_id": WORKER_ID,
            },
        ).execute()
    except Exception as e:
        logger.error("claim_embedding_batch failed: %s", e)
        return {"claimed": 0, "completed": 0, "failed": 0, "permanent_failures": 0}

    jobs = batch_result.data or []
    if not jobs:
        return {"claimed": 0, "completed": 0, "failed": 0, "permanent_failures": 0}

    logger.info("Embedding cycle: claimed %d jobs (worker=%s)", len(jobs), WORKER_ID)

    completed = 0
    failed = 0
    permanent_failures = 0

    for job in jobs:
        job_id: str = job["job_id"]
        chunk_id: str = job["knowledge_chunk_id"]
        title: str = job.get("title") or ""
        content: str = job.get("content") or ""
        retry_count: int = job.get("retry_count", 0)

        # Build text: title + separator + content (mirrors content_hash SHA-256 in trigger)
        text = title + "\n\n" + content if content else title

        try:
            vector = await get_embedding(text)

            supabase.rpc(
                "complete_embedding_job",
                {
                    "p_job_id": job_id,
                    "p_embedding": vector,
                },
            ).execute()

            completed += 1
            logger.debug(
                "Embedded chunk %s (job=%s, retry=%d)", chunk_id[:8], job_id[:8], retry_count
            )

        except Exception as e:
            error_msg = str(e)[:500]
            logger.error(
                "Embedding failed for chunk %s (job=%s): %s",
                chunk_id[:8],
                job_id[:8],
                error_msg,
            )

            try:
                fail_result = supabase.rpc(
                    "fail_embedding_job",
                    {
                        "p_job_id": job_id,
                        "p_error_message": error_msg,
                    },
                ).execute()
                outcome = fail_result.data or {}
                status = outcome.get("status", "unknown")

                if status == "failed_permanent":
                    permanent_failures += 1
                    logger.error(
                        "PERMANENT FAILURE: chunk %s exhausted retries (retry=%d)",
                        chunk_id[:8],
                        retry_count,
                    )
                else:
                    failed += 1
                    logger.warning(
                        "Embedding job %s will retry (attempt %d/%d)",
                        job_id[:8],
                        retry_count + 1,
                        outcome.get("max_retries", 3),
                    )

            except Exception as fail_exc:
                logger.error(
                    "fail_embedding_job failed for job %s: %s", job_id[:8], fail_exc
                )
                failed += 1

    logger.info(
        "Embedding cycle done: claimed=%d completed=%d failed=%d permanent=%d",
        len(jobs),
        completed,
        failed,
        permanent_failures,
    )

    return {
        "claimed": len(jobs),
        "completed": completed,
        "failed": failed,
        "permanent_failures": permanent_failures,
    }


async def embedding_worker_loop(supabase) -> None:
    """
    Continuous embedding worker loop.

    Dok 5 §15.2: runs every EMBEDDING_INTERVAL_SECONDS (default 60s).
    Started as asyncio.Task in FastAPI lifespan — cancelled on shutdown.
    SKIP LOCKED: multiple instances can run safely (L-NEW-2).
    """
    settings = get_settings()
    interval = settings.EMBEDDING_INTERVAL_SECONDS

    logger.info(
        "Embedding worker started (worker_id=%s, interval=%ds, provider=%s)",
        WORKER_ID,
        interval,
        settings.EMBEDDING_PROVIDER,
    )

    # If no API key is configured, log once at debug and sleep — no noise in logs.
    provider = settings.EMBEDDING_PROVIDER.lower()
    no_key = (provider == "voyage" and not settings.VOYAGE_API_KEY) or (
        provider == "openai" and not settings.OPENAI_API_KEY
    )
    if no_key:
        logger.debug(
            "Embedding worker: no API key configured (EMBEDDING_PROVIDER=%s). "
            "Worker will skip cycles until a key is set.",
            settings.EMBEDDING_PROVIDER,
        )

    while True:
        try:
            # Skip cycle silently when no API key — avoids noise until key is wired
            _s = get_settings()
            _p = _s.EMBEDDING_PROVIDER.lower()
            if (_p == "voyage" and not _s.VOYAGE_API_KEY) or (
                _p == "openai" and not _s.OPENAI_API_KEY
            ):
                await asyncio.sleep(interval)
                continue

            await run_embedding_cycle(supabase)
        except asyncio.CancelledError:
            logger.info("Embedding worker cancelled — shutting down")
            raise
        except Exception as e:
            # Non-fatal: log and continue. Next cycle will retry.
            logger.error("Embedding worker loop error: %s", e, exc_info=True)

        await asyncio.sleep(interval)
