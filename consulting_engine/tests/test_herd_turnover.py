"""Tests for Herd Turnover module — validate against Excel reference.

Tolerance: ±0.01 head (Excel uses different float precision).
Excel has 24 months of monthly data + 12 annual summaries.
"""

import json
from datetime import date
from pathlib import Path

import pytest

from app.engine.timeline import calculate_timeline
from app.engine.input_params import validate_and_enrich_input
from app.engine.herd_turnover import calculate_herd_turnover
from app.models.schemas import ProjectInput

FIXTURES = Path(__file__).parent / "fixtures" / "excel_reference.json"
TOLERANCE = 0.01  # ±0.01 heads


def load_reference():
    with open(FIXTURES) as f:
        return json.load(f)


def make_default_input():
    """Default input matching Excel reference: 200 cows, capacity 300, Зимний отёл.

    Excel file: Zengi.Farm_Model farm_020426_v10_WintSumm.xlsx
    Input!F64 = "Зимний" → calving_month_index = 18
    """
    return ProjectInput(
        project_start_date=date(2026, 8, 31),
        initial_cows=200,
        reproducer_capacity=300,
        purchase_price_cow=550_000,
        purchase_price_bull=650_000,
        bull_ratio=1 / 15,
        pasture_norm_ha=10,
        calving_scenario="Зимний",
        farm_type="beef_reproducer",
        equity_share=0.15,
    )


def calculate():
    """Run full herd calculation with default params."""
    params = make_default_input()
    enriched = validate_and_enrich_input(params)
    timeline = calculate_timeline(params.project_start_date)
    return calculate_herd_turnover(timeline, enriched, {})


def assert_array_match(actual, expected, group_name, field_name, tolerance=TOLERANCE):
    """Assert two arrays match within tolerance for first N elements."""
    n = min(len(actual), len(expected))
    for i in range(n):
        diff = abs(actual[i] - expected[i])
        assert diff <= tolerance, (
            f"{group_name}.{field_name}[{i}]: "
            f"expected {expected[i]:.4f}, got {actual[i]:.4f}, diff={diff:.6f}"
        )


class TestCows:
    """Маточное поголовье (Operating Model rows 50-58)."""

    def test_cows_eop(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["cows"]["eop"],
            ref["herd"]["cows"]["eop"],
            "cows", "eop",
        )

    def test_cows_bop(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["cows"]["bop"],
            ref["herd"]["cows"]["bop"],
            "cows", "bop",
        )

    def test_cows_purchased(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["cows"]["purchased"],
            ref["herd"]["cows"]["purchased"],
            "cows", "purchased",
        )

    def test_cows_mortality(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["cows"]["mortality"],
            ref["herd"]["cows"]["mortality"],
            "cows", "mortality",
        )

    def test_cows_culled_zero(self):
        """Выбраковка = 0 в шаблоне (строка 53)."""
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["cows"]["culled"],
            ref["herd"]["cows"]["culled"],
            "cows", "culled",
        )

    def test_cows_avg(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["cows"]["avg"],
            ref["herd"]["cows"]["avg"],
            "cows", "avg",
        )


class TestBulls:
    """Быки-производители (Operating Model rows 60-67)."""

    @pytest.mark.xfail(
        reason="CEO decision 2026-04-14 pt.2: bull culling logic остаётся как есть "
        "(не совпадает с Excel в месяце 17 — расхождение ~0.29 голов). "
        "См. DECISIONS_LOG.md 2026-04-14."
    )
    def test_bulls_eop(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["bulls"]["eop"],
            ref["herd"]["bulls"]["eop"],
            "bulls", "eop",
        )

    def test_bulls_purchased(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["bulls"]["purchased"],
            ref["herd"]["bulls"]["purchased"],
            "bulls", "purchased",
        )

    @pytest.mark.xfail(
        reason="CEO decision 2026-04-14 pt.2: bull culling остаётся как есть. "
        "См. DECISIONS_LOG.md 2026-04-14."
    )
    def test_bulls_culled(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["bulls"]["culled"],
            ref["herd"]["bulls"]["culled"],
            "bulls", "culled",
        )


class TestCalves:
    """Приплод (Operating Model rows 69-77)."""

    def test_calves_born(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["calves"]["born"],
            ref["herd"]["calves"]["born"],
            "calves", "born",
        )

    def test_calves_eop(self):
        """Calves EOP should be 0 (immediately split to heifers/steers)."""
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["calves"]["eop"],
            ref["herd"]["calves"]["eop"],
            "calves", "eop",
        )


class TestHeifers:
    """Тёлки (Operating Model rows 79-88)."""

    def test_heifers_eop(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["heifers"]["eop"],
            ref["herd"]["heifers"]["eop"],
            "heifers", "eop",
        )

    def test_heifers_from_calves(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["heifers"]["from_calves"],
            ref["herd"]["heifers"]["from_calves"],
            "heifers", "from_calves",
        )


class TestSteers:
    """Бычки (Operating Model rows 90-97)."""

    def test_steers_eop(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["steers"]["eop"],
            ref["herd"]["steers"]["eop"],
            "steers", "eop",
        )


class TestSummary:
    """Сводка (Operating Model rows 162-170)."""

    @pytest.mark.xfail(
        reason="Cascade from bulls divergence (CEO decision 2026-04-14 pt.2). "
        "total_avg_livestock включает bulls, поэтому наследует расхождение ~0.15 голов."
    )
    def test_total_avg_livestock(self):
        ref = load_reference()
        herd = calculate()
        assert_array_match(
            herd["total_avg_livestock"],
            ref["herd"]["total_avg_livestock"],
            "summary", "total_avg_livestock",
        )
