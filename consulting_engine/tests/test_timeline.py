"""Tests for Timeline module — validate against Excel reference."""

import json
from datetime import date
from pathlib import Path

from app.engine.timeline import calculate_timeline

FIXTURES = Path(__file__).parent / "fixtures" / "excel_reference.json"


def load_reference():
    with open(FIXTURES) as f:
        return json.load(f)


def test_timeline_start_date():
    """Timeline starts at 2026-08-31 (EOMONTH)."""
    ref = load_reference()
    tl = calculate_timeline(date(2026, 8, 31))

    assert tl["dates"][0] == "2026-08-31"
    assert tl["dates"][0] == ref["timeline"]["start_date"]


def test_timeline_dates_match_excel():
    """First 24 dates match Excel reference exactly."""
    ref = load_reference()
    tl = calculate_timeline(date(2026, 8, 31))

    excel_dates = ref["timeline"]["monthly_dates"]
    for i, excel_date in enumerate(excel_dates):
        if excel_date:
            assert tl["dates"][i] == excel_date, (
                f"Month {i+1}: expected {excel_date}, got {tl['dates'][i]}"
            )


def test_timeline_has_120_months():
    """Timeline always generates 120 months."""
    tl = calculate_timeline(date(2026, 8, 31))
    assert len(tl["dates"]) == 120
    assert tl["horizon_months"] == 120


def test_timeline_year_indices():
    """Year index: months 1-12 = year 1, months 13-24 = year 2, etc."""
    tl = calculate_timeline(date(2026, 8, 31))
    assert tl["year_index"][0] == 1
    assert tl["year_index"][11] == 1
    assert tl["year_index"][12] == 2
    assert tl["year_index"][119] == 10


def test_timeline_days_in_month():
    """Days in month for known dates."""
    tl = calculate_timeline(date(2026, 8, 31))
    # August 2026 = 31 days
    assert tl["days_in_month"][0] == 31
    # February 2027 = 28 days (not leap)
    assert tl["days_in_month"][6] == 28
    # February 2028 = 29 days (leap year)
    assert tl["days_in_month"][18] == 29
