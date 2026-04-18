"""Tests for Feeding Model — validate against Excel CFC row 247."""

import json
from datetime import date
from pathlib import Path

from app.engine.timeline import calculate_timeline
from app.engine.input_params import validate_and_enrich_input
from app.engine.herd_turnover import calculate_herd_turnover
from app.engine.feeding_model import calculate_feeding
from app.models.schemas import ProjectInput

FIXTURES = Path(__file__).parent / "fixtures" / "excel_reference.json"
TOLERANCE = 5.0  # тыс. тг — wider tolerance for feeding (complex seasonal logic)


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


def calculate():
    params = make_input()
    enriched = validate_and_enrich_input(params)
    tl = calculate_timeline(params.project_start_date)
    herd = calculate_herd_turnover(tl, enriched, {})
    return calculate_feeding(tl, enriched, herd, {}), tl


class TestFeedingTotal:
    """Total reproducer feeding cost (CFC row 247)."""

    def test_bulls_month1(self):
        """Bulls feeding month 1 = -3.045 (salt only, pasture season)."""
        feeding, tl = calculate()
        bulls_m1 = feeding["groups"]["bulls"][0]
        assert abs(bulls_m1 - (-3.045)) < 0.01, f"Bulls m1: {bulls_m1}"

    def test_total_reproducer_month1(self):
        """Row 247 month 1 = -55.245 (bulls salt + heifers salt+phosphate)."""
        ref = load_reference()
        feeding, tl = calculate()
        expected = ref["feeding"]["total_reproducer_row247"][0]
        actual = feeding["total_reproducer"][0]
        assert abs(actual - expected) < TOLERANCE, (
            f"Total reproducer m1: expected {expected:.1f}, got {actual:.1f}"
        )

    def test_total_reproducer_nonzero(self):
        """All 24 months should have non-zero feeding costs."""
        feeding, tl = calculate()
        nonzero = sum(1 for v in feeding["total_reproducer"][:24] if v != 0)
        # At minimum bulls feed every month
        assert nonzero >= 24, f"Only {nonzero}/24 months have feeding costs"

    def test_total_reproducer_negative(self):
        """All feeding costs should be negative (expenses)."""
        feeding, tl = calculate()
        for t in range(24):
            if feeding["total_reproducer"][t] != 0:
                assert feeding["total_reproducer"][t] < 0, (
                    f"Month {t+1}: {feeding['total_reproducer'][t]} should be negative"
                )

    def test_total_24month_sum(self):
        """Sum of 24 months ≈ Excel sum within 20%."""
        ref = load_reference()
        feeding, tl = calculate()
        # Use feeding_detail which has correct 24-month data (not old 36-value extraction)
        excel_costs = ref["feeding_detail"]["group_costs"]["total_reproducer"]
        excel_sum = sum(excel_costs[:24])
        calc_sum = sum(feeding["total_reproducer"][:24])
        ratio = abs(calc_sum / excel_sum) if excel_sum != 0 else 0
        assert 0.8 < ratio < 1.2, (
            f"24-month sum: excel={excel_sum:.0f}, calc={calc_sum:.0f}, ratio={ratio:.2f}"
        )

    def test_molodnyak_nonzero_in_calving_months(self):
        """DEF-WEANING-01 P3: group_costs['molodnyak'] must be non-zero in suckling window.

        Winter calving (calving_mi=18) → first calving at month_index=18 (t=17).
        Suckling window = 6 months → molodnyak non-zero during months 17..22 (t=17..22).
        Priority 3 previously used herd['calves']['avg'] = 0 always → 0 costs.
        """
        feeding, tl = calculate()
        molodnyak = feeding["groups"]["molodnyak"]
        # Winter calving_mi=18 → project starts Aug 31 → mi=18 is month index 18 → t=17
        mi = tl["month_index"]
        calving_t = next(t for t, m in enumerate(mi) if m == 18)
        # At least one month in the suckling window [calving_t, calving_t+5] must be non-zero
        suckling_window = molodnyak[calving_t: calving_t + 6]
        assert any(v != 0.0 for v in suckling_window), (
            f"molodnyak group all-zero in 6-month suckling window after first calving (t={calving_t}). "
            "DEF-WEANING-01 P3 fix not applied."
        )
