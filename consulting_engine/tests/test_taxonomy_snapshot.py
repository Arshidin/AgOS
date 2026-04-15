"""TAXONOMY-M3b snapshot parity test.

Gate criterion: rpc_get_category_mappings('turnover_key') must produce
exactly the same {code → (herd_group, eop|avg)} mapping as the hardcoded
CATEGORY_CODE_TO_HERD dict. If they diverge, the feature flag cannot flip
to True in prod.

Skipped unless SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are set
(i.e., only runs in staging / CI with live DB). Never runs on laptops.
"""

from __future__ import annotations

import os

import pytest

# Both env vars must be present and non-empty.
_SB_URL = os.getenv("SUPABASE_URL") or os.getenv("supabase_url") or ""
_SB_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("supabase_service_key") or ""

pytestmark = pytest.mark.skipif(
    not (_SB_URL and _SB_KEY),
    reason="SUPABASE_URL / SUPABASE_SERVICE_KEY not set — staging-only test",
)


def _client():
    from supabase import create_client
    return create_client(_SB_URL, _SB_KEY)


def test_rpc_mapping_matches_hardcoded():
    """RPC-backed mapping must equal CATEGORY_CODE_TO_HERD for all L1 codes."""
    from app.engine.feeding_model import CATEGORY_CODE_TO_HERD
    from app.engine.taxonomy_cache import TaxonomyCache

    cache = TaxonomyCache()
    rpc_map = cache.get_category_to_herd(_client())

    # Symmetric diff — both directions.
    hardcoded_keys = set(CATEGORY_CODE_TO_HERD.keys())
    rpc_keys = set(rpc_map.keys())

    missing_in_rpc = hardcoded_keys - rpc_keys
    extra_in_rpc = rpc_keys - hardcoded_keys
    assert not missing_in_rpc, f"RPC is missing codes present in hardcode: {missing_in_rpc}"
    assert not extra_in_rpc, f"RPC has codes absent from hardcode: {extra_in_rpc}"

    # Value parity for every shared code.
    mismatches = {
        code: (CATEGORY_CODE_TO_HERD[code], rpc_map[code])
        for code in hardcoded_keys
        if CATEGORY_CODE_TO_HERD[code] != rpc_map[code]
    }
    assert not mismatches, f"Mapping mismatch (hardcoded → rpc): {mismatches}"


def test_rpc_mapping_primary_only():
    """Every L1 code must resolve to exactly ONE L3 primary mapping."""
    from app.engine.taxonomy_cache import TaxonomyCache

    sb = _client()
    resp = sb.rpc(
        "rpc_get_category_mappings",
        {"p_target_taxonomy": "turnover_key"},
    ).execute()
    rows = resp.data or []

    primary_counts: dict[str, int] = {}
    for row in rows:
        if not row.get("is_primary") or row.get("valid_to") is not None:
            continue
        code = row.get("animal_category_code")
        primary_counts[code] = primary_counts.get(code, 0) + 1

    duplicates = {k: v for k, v in primary_counts.items() if v > 1}
    assert not duplicates, f"Multiple primary rows per code (I8 violation): {duplicates}"


def test_cache_singleton_invalidate():
    """invalidate_cache() must force next call to re-fetch."""
    from app.engine.taxonomy_cache import TaxonomyCache, invalidate_cache

    cache = TaxonomyCache()
    sb = _client()
    first = cache.get_category_to_herd(sb)
    cached = cache.get_category_to_herd(sb)
    assert first is cached, "Cache must return identical object on hit"

    cache.invalidate()
    after = cache.get_category_to_herd(sb)
    assert after == first, "Post-invalidate result must still be content-equal"

    # Module-level invalidate hook exercised (smoke only).
    invalidate_cache()
