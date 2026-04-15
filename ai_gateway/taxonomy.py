"""TAXONOMY-M3b (ADR-ANIMAL-01) — AI Gateway canonical L1 code resolver.

Exposes the currently-valid L1 animal_categories code set so tool schemas
(`tools/vet.py`, `tools/farm.py`, …) and extraction validators can drive
their enums from the DB instead of a frozen hardcode.

Feature-flagged via `settings.TAXONOMY_RPC_READ`:
  - flag OFF → returns `FALLBACK_L1_CODES` (mirror of d01 seeds; safe default)
  - flag ON  → calls rpc_list_animal_categories(current_date, False) once
               per process lifetime; cache invalidated via invalidate_l1().

Never raises — RPC failure silently falls back. Extraction / tool schema
correctness never hard-depends on live DB reachability.
"""

from __future__ import annotations

import logging
from threading import Lock
from typing import Optional

from ai_gateway.config import get_settings, get_supabase

logger = logging.getLogger("agos.gateway.taxonomy")


# Mirror of current d01_kernel.sql animal_categories seeds (12 codes).
# Keep in sync manually — the snapshot test in consulting_engine/tests/
# test_taxonomy_snapshot.py asserts parity against rpc_list_animal_categories.
FALLBACK_L1_CODES: tuple[str, ...] = (
    "SUCKLING_CALF",
    "YOUNG_CALF",
    "HEIFER_YOUNG",
    "HEIFER_PREG",
    "COW",
    "COW_CULL",
    "BULL_CALF",
    "STEER",
    "BULL_BREEDING",
    "BULL_CULL",
    "OX",
    "MIXED",
)


class _L1Cache:
    def __init__(self) -> None:
        self._lock = Lock()
        self._codes: Optional[tuple[str, ...]] = None

    def invalidate(self) -> None:
        with self._lock:
            self._codes = None

    def get(self) -> tuple[str, ...]:
        """Return L1 codes from RPC (flag on) or fallback (flag off / error)."""
        settings = get_settings()
        if not settings.TAXONOMY_RPC_READ:
            return FALLBACK_L1_CODES

        with self._lock:
            if self._codes is not None:
                return self._codes

        try:
            sb = get_supabase()
            resp = sb.rpc(
                "rpc_list_animal_categories",
                # p_as_of defaults to current_date in SQL; passing null is fine
                {"p_as_of": None, "p_include_deprecated": False},
            ).execute()
            rows = resp.data or []
            codes = tuple(r["code"] for r in rows if r.get("code"))
            if not codes:
                logger.warning("rpc_list_animal_categories returned empty — using fallback")
                return FALLBACK_L1_CODES
        except Exception as exc:
            logger.warning("rpc_list_animal_categories failed (%s) — using fallback", exc)
            return FALLBACK_L1_CODES

        with self._lock:
            self._codes = codes
        return codes


_cache = _L1Cache()


def get_l1_codes() -> tuple[str, ...]:
    """Public accessor — returns the currently-authoritative L1 code tuple."""
    return _cache.get()


def invalidate_l1() -> None:
    """Event hook: called from `standards.animal_category.updated` subscriber."""
    _cache.invalidate()


def is_valid_l1_code(code: str) -> bool:
    """Cheap validator for extraction / tool-input pre-check."""
    return code in get_l1_codes()
