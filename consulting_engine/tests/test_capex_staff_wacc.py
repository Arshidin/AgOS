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
