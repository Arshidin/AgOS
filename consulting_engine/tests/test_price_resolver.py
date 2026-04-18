"""Tests for price_resolver — ADR-PRICES-01/02."""

from app.engine.price_resolver import resolve_price_params, SAFETY_DEFAULTS


def _make_row(cat: str, price: float, year: int = 2026, age_months=None, region_id=None) -> dict:
    return {
        "category": "livestock_prices",
        "data": {
            "livestock_category": cat,
            "year": year,
            "region_id": region_id,
            "age_months": age_months,
            "price_per_kg": price,
        },
    }


def _refs(*rows) -> dict:
    return {"livestock_prices": list(rows)}


class TestPriorityChain:
    """P1 (project override) > P2 (DB) > P3 (safety default)."""

    def test_p1_override_wins(self):
        raw = {"steer_own": 2500.0, "heifer_breeding": None, "cow_culled": None, "bull_culled": None}
        db_row = _make_row("steer_own", 1800.0)
        resolved, priority = resolve_price_params(raw, _refs(db_row), 2026)
        assert resolved["steer_own"] == 2500.0
        assert priority["steer_own"] == 1

    def test_p2_db_baseline_used(self):
        raw = {"steer_own": None, "heifer_breeding": None, "cow_culled": None, "bull_culled": None}
        db_row = _make_row("steer_own", 1750.0)
        resolved, priority = resolve_price_params(raw, _refs(db_row), 2026)
        assert resolved["steer_own"] == 1750.0
        assert priority["steer_own"] == 2

    def test_p3_safety_default_when_no_db(self):
        raw = {"steer_own": None, "heifer_breeding": None, "cow_culled": None, "bull_culled": None}
        resolved, priority = resolve_price_params(raw, {}, 2026)
        assert resolved["steer_own"] == SAFETY_DEFAULTS["steer_own"]
        assert priority["steer_own"] == 3

    def test_all_categories_resolved(self):
        raw = {cat: None for cat in ("steer_own", "heifer_breeding", "cow_culled", "bull_culled")}
        resolved, _ = resolve_price_params(raw, {}, 2026)
        for cat in raw:
            assert resolved[cat] > 0, f"{cat} resolved to non-positive"


class TestAdrPrices02:
    """ADR-PRICES-02: age-specific steer_own price lookup."""

    def _raw(self):
        return {"steer_own": None, "heifer_breeding": None, "cow_culled": None, "bull_culled": None}

    def test_age_specific_price_matched(self):
        """steer_sale_age_months=12 → 12mo price wins over baseline."""
        baseline = _make_row("steer_own", 1800.0)               # age=None
        age12 = _make_row("steer_own", 1900.0, age_months=12)   # age=12
        resolved, priority = resolve_price_params(
            self._raw(), _refs(baseline, age12), 2026, steer_sale_age_months=12
        )
        assert resolved["steer_own"] == 1900.0
        assert priority["steer_own"] == 2

    def test_age_specific_different_age(self):
        """steer_sale_age_months=18 → 18mo row used, not 12mo."""
        age12 = _make_row("steer_own", 1900.0, age_months=12)
        age18 = _make_row("steer_own", 2000.0, age_months=18)
        resolved, _ = resolve_price_params(
            self._raw(), _refs(age12, age18), 2026, steer_sale_age_months=18
        )
        assert resolved["steer_own"] == 2000.0

    def test_age_not_in_db_falls_to_baseline(self):
        """steer_sale_age_months=7 with no 7mo row → baseline price."""
        baseline = _make_row("steer_own", 1800.0)
        age12 = _make_row("steer_own", 1900.0, age_months=12)
        resolved, priority = resolve_price_params(
            self._raw(), _refs(baseline, age12), 2026, steer_sale_age_months=7
        )
        assert resolved["steer_own"] == 1800.0
        assert priority["steer_own"] == 2

    def test_legacy_mode_age0_uses_baseline(self):
        """steer_sale_age_months=0 (December legacy) → age-specific rows ignored."""
        baseline = _make_row("steer_own", 1800.0)
        age12 = _make_row("steer_own", 1900.0, age_months=12)
        resolved, _ = resolve_price_params(
            self._raw(), _refs(baseline, age12), 2026, steer_sale_age_months=0
        )
        assert resolved["steer_own"] == 1800.0

    def test_region_rows_excluded(self):
        """Rows with region_id != None are filtered out (region pricing not yet supported)."""
        regional = _make_row("steer_own", 9999.0, region_id="kz-alm")
        resolved, priority = resolve_price_params(
            self._raw(), _refs(regional), 2026
        )
        assert resolved["steer_own"] == SAFETY_DEFAULTS["steer_own"]
        assert priority["steer_own"] == 3

    def test_future_year_row_excluded(self):
        """Row with year > project_year is ignored (not yet in effect)."""
        future = _make_row("steer_own", 9999.0, year=2030)
        baseline = _make_row("steer_own", 1800.0, year=2026)
        resolved, _ = resolve_price_params(
            self._raw(), _refs(future, baseline), 2026
        )
        assert resolved["steer_own"] == 1800.0

    def test_p1_override_beats_age_specific(self):
        """Explicit project override (P1) always wins, even over age-matched DB row."""
        raw = {"steer_own": 2500.0, "heifer_breeding": None, "cow_culled": None, "bull_culled": None}
        age12 = _make_row("steer_own", 1900.0, age_months=12)
        resolved, priority = resolve_price_params(
            raw, _refs(age12), 2026, steer_sale_age_months=12
        )
        assert resolved["steer_own"] == 2500.0
        assert priority["steer_own"] == 1
