"""TAXONOMY-M3b cache — RPC-backed animal category → herd group resolver.

Wraps `rpc_get_category_mappings(target_taxonomy)` with in-process read-through
cache. Feature-flagged via settings.taxonomy_rpc_read; when flag is off, callers
MUST fall back to the hardcoded CATEGORY_CODE_TO_HERD dict in feeding_model.

Invalidation:
  - `invalidate()` clears the cache; intended callers are event handlers
    subscribed to `standards.animal_category.updated` (Dok 4 §3.9). Wiring the
    subscriber is a separate follow-up — for now admin RPCs that mutate the
    taxonomy must trigger invalidate() manually or restart the process.

Source of truth:
  - L1 (animal_categories): UI-facing codes — COW, STEER, BULL_BREEDING, …
  - L3 (herd turnover groups): cows / bulls / calves / heifers / steers, each
    with eop or avg measurement. The eop/avg dimension is NOT in the taxonomy
    (turnover_key only stores the group name), so this module layers it from
    a stable per-group rule: bulls/cows → eop; calves/heifers/steers → avg.
    This rule is invariant for CFC math and does not belong in d01 seeds.
"""

from __future__ import annotations

from threading import Lock
from typing import Optional

from app.config import settings


# eop (end-of-period) vs avg measurement is a CFC-math property of the herd
# group, not of the taxonomy. Keep here — tight coupling with feeding_model.
_HERD_MEASUREMENT: dict[str, str] = {
    "cows":    "eop",
    "bulls":   "eop",
    "calves":  "avg",
    "heifers": "avg",
    "steers":  "avg",
}


class TaxonomyCache:
    """Read-through cache for L1 → L3 (herd turnover) mappings."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._category_to_herd: Optional[dict[str, tuple[str, str]]] = None

    def invalidate(self) -> None:
        with self._lock:
            self._category_to_herd = None

    def get_category_to_herd(self, supabase_client) -> dict[str, tuple[str, str]]:
        """Return {animal_category_code: (herd_group_key, eop|avg)}.

        Calls rpc_get_category_mappings('turnover_key') once, filters to
        is_primary=true + currently-valid rows, and layers the eop/avg
        measurement via _HERD_MEASUREMENT. Result is cached until invalidate().
        """
        with self._lock:
            if self._category_to_herd is not None:
                return self._category_to_herd

        resp = supabase_client.rpc(
            "rpc_get_category_mappings",
            {"p_target_taxonomy": "turnover_key"},
        ).execute()
        rows = resp.data or []

        mapping: dict[str, tuple[str, str]] = {}
        for row in rows:
            if not row.get("is_primary"):
                continue
            if row.get("valid_to") is not None:
                continue
            code = row.get("animal_category_code")
            herd_key = row.get("target_code")
            if not code or not herd_key:
                continue
            measurement = _HERD_MEASUREMENT.get(herd_key)
            if measurement is None:
                # Unknown herd group → skip rather than silently map wrong.
                continue
            mapping[code] = (herd_key, measurement)

        with self._lock:
            self._category_to_herd = mapping
        return mapping


# Module-level singleton — safe because settings are process-wide and the
# cache only holds immutable primitives.
_cache = TaxonomyCache()


def get_category_to_herd(
    supabase_client,
    hardcoded_fallback: dict[str, tuple[str, str]],
) -> dict[str, tuple[str, str]]:
    """Feature-flagged resolver.

    Returns the RPC-backed mapping when settings.taxonomy_rpc_read is True,
    otherwise returns the hardcoded fallback unchanged. On RPC failure the
    fallback is returned — feeding math must never break because the
    taxonomy RPC is transiently unavailable.
    """
    if not settings.taxonomy_rpc_read:
        return hardcoded_fallback
    try:
        result = _cache.get_category_to_herd(supabase_client)
        if not result:
            return hardcoded_fallback
        return result
    except Exception:
        return hardcoded_fallback


def invalidate_cache() -> None:
    """Public hook for event-driven invalidation."""
    _cache.invalidate()
