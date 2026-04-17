"""Tests for CAPEX, Staff, and WACC modules against Excel reference."""

import json
from datetime import date
from pathlib import Path

from app.engine.timeline import calculate_timeline
from app.engine.input_params import validate_and_enrich_input
from app.engine.capex import calculate_capex
from app.engine.staff import calculate_staff
from app.engine.wacc import calculate_wacc_rates
from app.models.schemas import ProjectInput

FIXTURES = Path(__file__).parent / "fixtures" / "excel_reference.json"


def load_reference():
    with open(FIXTURES) as f:
        return json.load(f)


def make_input():
    return ProjectInput(
        project_start_date=date(2026, 8, 31),
        initial_cows=200,
        reproducer_capacity=300,
        calving_scenario="Зимний",
    )


# =====================================================
# CAPEX Tests
# =====================================================

class TestCapex:
    """CAPEX — итоговые суммы из CAPEX sheet."""

    def test_farm_total(self):
        """Farm block total ~ 177.7M (row 29)."""
        enriched = validate_and_enrich_input(make_input())
        capex = calculate_capex(enriched, {})
        # Excel row 29: 177,736,145.54
        assert abs(capex["farm"]["total"] - 177_736_145.54) < 1.0

    def test_pasture_total(self):
        """Pasture block total ~ 47.089M (row 38)."""
        enriched = validate_and_enrich_input(make_input())
        capex = calculate_capex(enriched, {})
        # Excel row 38: 47,089,000
        assert abs(capex["pasture"]["total"] - 47_089_000) < 1.0

    def test_equipment_total(self):
        """Equipment block total = 53.4M (row 49)."""
        enriched = validate_and_enrich_input(make_input())
        capex = calculate_capex(enriched, {})
        assert capex["equipment"]["total"] == 53_400_000

    def test_tools_total(self):
        """Tools block total = 4.24M (row 71)."""
        enriched = validate_and_enrich_input(make_input())
        capex = calculate_capex(enriched, {})
        assert capex["tools"]["total"] == 4_240_000

    def test_grand_total(self):
        """Grand total ~ 282.465M (row 73)."""
        enriched = validate_and_enrich_input(make_input())
        capex = calculate_capex(enriched, {})
        # Excel row 73: 282,465,145.54
        assert abs(capex["grand_total"] - 282_465_145.54) < 1.0

    def test_depreciation_positive(self):
        """Depreciation rates should be positive."""
        enriched = validate_and_enrich_input(make_input())
        capex = calculate_capex(enriched, {})
        assert capex["depreciation_buildings_monthly"] > 0
        assert capex["depreciation_equipment_monthly"] > 0


# =====================================================
# CAPEX — Priority 2 data-driven engine (ADR-CAPEX-01)
# =====================================================

CAPEX_SEED_FIXTURE = Path(__file__).parent / "fixtures" / "capex_seed.json"


def _load_capex_refs():
    """Load the full CAPEX reference dict as engine.capex expects.

    Matches output of orchestrator._group_references — grouped by category.
    """
    with open(CAPEX_SEED_FIXTURE) as f:
        return json.load(f)


def _make_enriched(capacity=300, calving="Зимний",
                   enclosed="sandwich", support="light_frame",
                   overrides=None, pasture_norm_ha=10):
    """Build enriched_input dict as _data_driven_calculate_capex consumes.

    We skip the full ProjectInput→validate_and_enrich_input round-trip because
    Priority 2 only reads a handful of fields and overrides are not yet in the
    default pipeline (Phase 3 adds them via UI save → calculate.py injection).
    """
    params = ProjectInput(
        project_start_date=date(2026, 8, 31),
        initial_cows=max(1, capacity // 2),
        reproducer_capacity=capacity,
        calving_scenario=calving,
        pasture_norm_ha=pasture_norm_ha,
        construction_material_enclosed=enclosed,
        construction_material_support=support,
        infra_items_override=overrides or [],
    )
    enriched = validate_and_enrich_input(params)
    enriched["infra_items_override"] = overrides or []
    enriched["construction_material_enclosed"] = enclosed
    enriched["construction_material_support"] = support
    return enriched


class TestCapexDataDriven:
    """Priority 2 engine — 282,465,145.54 ₸ parity + scaling + overrides."""

    def test_grand_total_matches_excel(self):
        """At capacity=300, Зимний, defaults → grand_total ≈ 282.4M (±1%)."""
        enriched = _make_enriched()
        capex = calculate_capex(enriched, _load_capex_refs())
        assert capex["priority_used"] == 2
        # Excel row 73: 282,465,145.54 ₸. 4-decimal rounding in seed norms
        # (1.6667, 0.1667, 6.6667, 0.6667) contributes ~+1,600 ₸ drift.
        assert abs(capex["grand_total"] - 282_465_145.54) < 2_824_651.45

    def test_capacity_scales_area_items(self):
        """FAC-001 (area_per_head) 10x at 3000 heads; INF-001 (fixed) constant."""
        refs = _load_capex_refs()
        small = _make_enriched(capacity=300)
        big = _make_enriched(capacity=3000)
        c_small = calculate_capex(small, refs)
        c_big = calculate_capex(big, refs)

        fac001_s = next(i for i in c_small["farm"]["items"] if i["code"] == "FAC-001")
        fac001_b = next(i for i in c_big["farm"]["items"] if i["code"] == "FAC-001")
        ratio = fac001_b["cost"] / fac001_s["cost"]
        assert abs(ratio - 10.0) < 0.01, f"FAC-001 ratio={ratio}"

        inf001_s = next(i for i in c_small["farm"]["items"] if i["code"] == "INF-001")
        inf001_b = next(i for i in c_big["farm"]["items"] if i["code"] == "INF-001")
        assert inf001_s["cost"] == inf001_b["cost"] == 30_000_000

    def test_calving_scenario_affects_calving_facility(self):
        """FAC-012 Летний multiplier 0.5 → half the Зимний cost."""
        refs = _load_capex_refs()
        winter = _make_enriched(calving="Зимний")
        summer = _make_enriched(calving="Летний")
        c_w = calculate_capex(winter, refs)
        c_s = calculate_capex(summer, refs)

        fac012_w = next(i for i in c_w["farm"]["items"] if i["code"] == "FAC-012")
        fac012_s = next(i for i in c_s["farm"]["items"] if i["code"] == "FAC-012")
        assert fac012_w["cost"] == 16_000_800  # 0.6667 × 300 × 80000
        # Летний: multiplier 0.5 → half
        assert abs(fac012_s["cost"] / fac012_w["cost"] - 0.5) < 0.001

    def test_override_exclude_removes_item(self):
        """include=false removes a norm from the output + affects subtotal."""
        refs = _load_capex_refs()
        baseline = calculate_capex(_make_enriched(), refs)
        enriched = _make_enriched(overrides=[{"code": "FAC-015", "include": False}])
        excluded = calculate_capex(enriched, refs)

        codes_in = {i["code"] for i in excluded["farm"]["items"]}
        assert "FAC-015" not in codes_in
        # FAC-015 base cost = ~9,750,195. Removal → subtotal drops accordingly.
        delta = baseline["farm"]["subtotal"] - excluded["farm"]["subtotal"]
        assert abs(delta - 9_750_195) < 10  # rounding tolerance

    def test_override_material_swaps_price(self):
        """material_override on FAC-001 → brick (50k) → 120M instead of 30M."""
        refs = _load_capex_refs()
        enriched = _make_enriched(overrides=[
            {"code": "FAC-001", "material_override": "brick"}
        ])
        capex = calculate_capex(enriched, refs)
        fac001 = next(i for i in capex["farm"]["items"] if i["code"] == "FAC-001")
        # 8 × 300 × 50000 = 120M (brick replaces bespoke 12500)
        assert fac001["cost"] == 120_000_000
        assert fac001["material_resolved"] == "override:brick"

    def test_pasture_scales_with_area(self):
        """At capacity 600 × 10 ha/head = 6000 ha → 2 скважины + 4 поилки."""
        refs = _load_capex_refs()
        enriched = _make_enriched(capacity=600, pasture_norm_ha=10)
        capex = calculate_capex(enriched, refs)
        pst002 = next(i for i in capex["pasture"]["items"] if i["code"] == "PST-002")
        pst003 = next(i for i in capex["pasture"]["items"] if i["code"] == "PST-003")
        # PST-002 divisor=1500 → ceil(6000/1500)=4 поилки × 8.8M
        assert pst002["qty"] == 4
        assert pst002["cost"] == 35_200_000
        # PST-003 divisor=3000 → ceil(6000/3000)=2 скважины × 3M
        assert pst003["qty"] == 2
        assert pst003["cost"] == 6_000_000

    def test_empty_refs_falls_to_legacy(self):
        """Priority 3 fallback — empty norms → hardcoded Excel numbers (Тест 7)."""
        enriched = _make_enriched()
        capex = calculate_capex(enriched, {})
        assert capex["priority_used"] == 3
        # Legacy gives the exact Excel total (hardcoded)
        assert abs(capex["grand_total"] - 282_465_145.54) < 1.0

    def test_bespoke_price_override_applied(self):
        """FAC-009 uses 3450 ₸/m² (unit_cost_per_m2_override), not support 15000."""
        refs = _load_capex_refs()
        enriched = _make_enriched()
        capex = calculate_capex(enriched, refs)
        fac009 = next(i for i in capex["farm"]["items"] if i["code"] == "FAC-009")
        # 300 m² × 3450 = 1,035,000. If support price (15000) bled through:
        # 300 × 15000 = 4,500,000 — clearly wrong. Assert bespoke path.
        assert fac009["cost"] == 1_035_000
        assert fac009["material_resolved"] == "bespoke_price"


# =====================================================
# Staff Tests
# =====================================================

class TestStaff:
    """Staff — ФОТ totals from Staff sheet."""

    def test_total_monthly_payroll_month1(self):
        """Total payroll month 1 = 1940.34 тыс. тг (Staff!J36)."""
        tl = calculate_timeline(date(2026, 8, 31))
        enriched = validate_and_enrich_input(make_input())
        staff = calculate_staff(tl, enriched, {})
        # Excel: 1940.33664 тыс. тг
        assert abs(staff["monthly_payroll"][0] - 1940.33664) < 1.0

    def test_personnel_month1(self):
        """Personnel (gross salaries) month 1 = 1742.4 тыс. тг."""
        tl = calculate_timeline(date(2026, 8, 31))
        enriched = validate_and_enrich_input(make_input())
        staff = calculate_staff(tl, enriched, {})
        assert abs(staff["monthly_personnel"][0] - 1742.4) < 0.1

    def test_so_month1(self):
        """SO (social contributions) month 1 = 58.29 тыс. тг."""
        tl = calculate_timeline(date(2026, 8, 31))
        enriched = validate_and_enrich_input(make_input())
        staff = calculate_staff(tl, enriched, {})
        assert abs(staff["monthly_so"][0] - 58.28655) < 1.0

    def test_sn_month1(self):
        """SN (social tax) month 1 = 87.38 тыс. тг."""
        tl = calculate_timeline(date(2026, 8, 31))
        enriched = validate_and_enrich_input(make_input())
        staff = calculate_staff(tl, enriched, {})
        assert abs(staff["monthly_sn"][0] - 87.37809) < 1.0

    def test_osms_month1(self):
        """OSMS month 1 = 52.27 тыс. тг."""
        tl = calculate_timeline(date(2026, 8, 31))
        enriched = validate_and_enrich_input(make_input())
        staff = calculate_staff(tl, enriched, {})
        assert abs(staff["monthly_osms"][0] - 52.272) < 1.0

    def test_total_fte(self):
        """Total FTE = 3.3."""
        tl = calculate_timeline(date(2026, 8, 31))
        enriched = validate_and_enrich_input(make_input())
        staff = calculate_staff(tl, enriched, {})
        assert abs(staff["total_fte"] - 3.3) < 0.01

    def test_payroll_inflation_year2(self):
        """Year 2 payroll should be higher (11% CPI)."""
        tl = calculate_timeline(date(2026, 8, 31))
        enriched = validate_and_enrich_input(make_input())
        staff = calculate_staff(tl, enriched, {})
        # Month 13 (year 2) should be > month 1
        assert staff["monthly_payroll"][12] > staff["monthly_payroll"][0]


# =====================================================
# WACC Tests
# =====================================================

class TestWacc:
    """WACC — key rates from WACC sheet."""

    def test_wacc_rate(self):
        """WACC = 5.997% (WACC!E18)."""
        enriched = validate_and_enrich_input(make_input())
        wacc = calculate_wacc_rates(enriched, {})
        assert abs(wacc["wacc"] - 0.05997050563106797) < 0.0001

    def test_ke_usd(self):
        """ke_usd = 9.4792% (WACC!E14)."""
        enriched = validate_and_enrich_input(make_input())
        wacc = calculate_wacc_rates(enriched, {})
        assert abs(wacc["ke_usd"] - 0.094792) < 0.0001

    def test_ke_kzt(self):
        """ke_kzt = 19.47% (WACC!E17)."""
        enriched = validate_and_enrich_input(make_input())
        wacc = calculate_wacc_rates(enriched, {})
        assert abs(wacc["ke_kzt"] - 0.19470505631067958) < 0.001

    def test_cost_of_debt(self):
        """Cost of debt = 4.5% (WACC!E9)."""
        enriched = validate_and_enrich_input(make_input())
        wacc = calculate_wacc_rates(enriched, {})
        assert abs(wacc["cost_of_debt"] - 0.045) < 0.001
