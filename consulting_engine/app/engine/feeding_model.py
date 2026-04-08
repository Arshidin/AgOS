"""Модуль кормовой модели — 8 групп × корма (Часть 4.4 спецификации).

CFC sheet layout:
  Rows 7-15:  Маточное поголовье полный год — daily ration
  Rows 17-25: Маточное поголовье 9 мес. — daily ration
  Rows 27-33: Быки-производители — daily ration
  Rows 35-42: Молодняк — daily ration
  Rows 44-52: Тёлки предыдущего периода — daily ration
  Rows 54-62: Тёлки текущего периода — daily ration
  Rows 64-71: Бычки — daily ration
  Rows 73-80: Товарные бычки — daily ration

  Rows 87-99: Feed prices (тг/кг)

  Rows 184-192: Молодняк costs
  Rows 194-203: Тёлки предыд. costs
  Rows 205-214: Тёлки текущ. costs
  Rows 216-225: Маточн. 12 мес. costs
  Rows 227-236: Маточн. 9 мес. costs
  Rows 238-245: Быки costs
  Row 247: Всего репродуктор

Formula (universal):
  cost = -(price_per_kg × daily_ration_kg × days_in_month × head_count) / 1000

Seasons (Kazakhstan):
  Pasture: May-October (months 5-10 in calendar year)
  Stall: November-April (months 11-12, 1-4)
"""

from datetime import date


# Feed prices (тг/кг) — from CFC rows 87-99
# Green mass = 0 (pasture is free, cows graze)
# Milk = 0 (not purchased)
# All others inflate annually (handled in _get_price)
FEED_PRICES_BASE = {
    "milk": 0,           # Row 87: free
    "green_mass": 0,     # Row 88: free (pasture)
    "concentrates": 80,  # Row 89
    "salt": 145,         # Row 90
    "hay": 28,           # Row 91
    "straw": 15,         # Row 92
    "bran_meal": 120,    # Row 93 (отруби/шроты)
    "feed_phosphate": 145, # Row 94
    "daf": 145,          # Row 95 (диаммонийфосфат)
    "mkf": 145,          # Row 96 (монокальцийфосфат)
    "bmvd": 145,         # Row 97
    "barley_meal": 36,   # Row 98 (дерть ячменная)
    "grain_waste": 63,   # Row 99 (зерноотходы)
}

# Annual inflation rate for feed prices
# Excel shows: 80→88.4 (10.5%), 28→30.94 (10.5%), 145→160.225 (10.5%)
# This is 10.5% annual CPI applied to feed prices (different from staff 11%)
FEED_INFLATION = 0.105


def _is_pasture_month(calendar_year: int, month_in_year: int) -> bool:
    """May-October = pasture, November-April = stall."""
    return 5 <= month_in_year <= 10


def _get_month_in_year(date_str: str) -> int:
    """Extract month (1-12) from date string."""
    return int(date_str[5:7])


def _feed_cost(price_kg: float, daily_kg: float, days: int, heads: float, inflation_factor: float = 1.0) -> float:
    """Universal feed cost formula (тыс. тг).

    cost = -(price × inflation × daily_kg × days × heads) / 1000
    """
    if daily_kg == 0 or heads == 0 or price_kg == 0:
        return 0.0
    return -(price_kg * inflation_factor * daily_kg * days * heads) / 1000


def _get_bulls_ration(is_pasture: bool) -> dict:
    """Быки-производители ration (rows 27-33)."""
    if is_pasture:
        return {
            "green_mass": (FEED_PRICES_BASE["green_mass"], 12.0),
            "salt": (FEED_PRICES_BASE["salt"], 0.05),
        }
    else:
        return {
            "hay": (FEED_PRICES_BASE["hay"], 8.0),
            "bran_meal": (FEED_PRICES_BASE["bran_meal"], 1.0),
            "concentrates": (FEED_PRICES_BASE["concentrates"], 2.78),
            "bmvd": (FEED_PRICES_BASE["bmvd"], 0.72),
            "salt": (FEED_PRICES_BASE["salt"], 0.045),
        }


def _get_cows_12m_ration(is_pasture: bool) -> dict:
    """Маточное поголовье полный год ration (rows 7-15).

    Excel-verified values from CFC rows 7-15.
    """
    if is_pasture:
        return {
            "green_mass": (FEED_PRICES_BASE["green_mass"], 32.0),
            "salt": (FEED_PRICES_BASE["salt"], 0.05),
        }
    else:
        return {
            "concentrates": (FEED_PRICES_BASE["concentrates"], 2.0),
            "salt": (FEED_PRICES_BASE["salt"], 0.06),
            "hay": (FEED_PRICES_BASE["hay"], 8.0),
            "straw": (FEED_PRICES_BASE["straw"], 2.0),
            "bran_meal": (FEED_PRICES_BASE["bran_meal"], 1.0),
            "daf": (FEED_PRICES_BASE["daf"], 0.04),
            "mkf": (FEED_PRICES_BASE["mkf"], 0.045),
        }


def _get_heifers_prev_ration(is_pasture: bool) -> dict:
    """Тёлки предыдущего периода ration (rows 44-52).

    Excel-verified: stall includes hay=4 and сенаж (hay=28 price)=5.
    """
    if is_pasture:
        return {
            "green_mass": (FEED_PRICES_BASE["green_mass"], 29.0),
            "salt": (FEED_PRICES_BASE["salt"], 0.03),
            "feed_phosphate": (FEED_PRICES_BASE["feed_phosphate"], 0.03),
        }
    else:
        return {
            "salt": (FEED_PRICES_BASE["salt"], 0.03),
            "feed_phosphate": (FEED_PRICES_BASE["feed_phosphate"], 0.03),
            "hay": (FEED_PRICES_BASE["hay"], 4.0),
            "senazh": (FEED_PRICES_BASE["hay"], 5.0),  # Сенаж priced same as hay
        }


def _get_calves_ration(is_pasture: bool) -> dict:
    """Молодняк ration (rows 35-42)."""
    if is_pasture:
        return {
            "green_mass": (FEED_PRICES_BASE["green_mass"], 10.0),
            "salt": (FEED_PRICES_BASE["salt"], 0.02),
            "feed_phosphate": (FEED_PRICES_BASE["feed_phosphate"], 0.02),
        }
    else:
        return {
            "milk": (FEED_PRICES_BASE["milk"], 8.0),
            "hay": (FEED_PRICES_BASE["hay"], 2.5),
            "concentrates": (FEED_PRICES_BASE["concentrates"], 1.0),
            "salt": (FEED_PRICES_BASE["salt"], 0.02),
            "feed_phosphate": (FEED_PRICES_BASE["feed_phosphate"], 0.02),
        }


def calculate_feeding(
    timeline: dict, enriched_input: dict, herd: dict, refs: dict
) -> dict:
    """Расчёт кормовой модели для всех 8 групп.

    Groups:
    1. Молодняк (calves after split — first months)
    2. Тёлки предыдущего периода (heifers from previous calving)
    3. Тёлки текущего периода (heifers from current calving)
    4. Маточное поголовье 12 мес. (cows — full year)
    5. Маточное поголовье 9 мес. (cows — 9 month variant)
    6. Быки-производители (bulls)
    7. Племенные бычки (доращивание) — 0 in sample
    8. Товарные бычки (доращивание) — 0 in sample

    Returns:
        dict with group costs and total_reproducer array
    """
    n = timeline["horizon_months"]
    dates = timeline["dates"]
    # CFC uses its own days-in-month (row 4): first month = 30 (not calendar 31)
    # This is because CFC counts from project start date (Aug 31) forward 30 days
    # Use 30 for months 1-2, then calendar days from month 3
    cfc_days = list(timeline["days_in_month"])
    cfc_days[0] = 30  # August: CFC uses 30
    cfc_days[1] = 30  # September: CFC uses 30
    days = cfc_days

    # CFC head count mapping (verified against Excel CFC rows 194, 216):
    # CFC has its own cow lifecycle tracking:
    #   Months 1-8: Cows fed as "тёлки предыд." (lighter ration)
    #   Month 9+:   Cows transition to "маточное 12 мес" (full cow ration)
    # Transition month = 9 (first April after project start)
    # Head count = cows_eop from Operating Model (seamless transition)

    TRANSITION_MONTH = 9  # Month when cows move from group 2 to group 4

    # Group 6: Bulls = bulls EOP from Operating Model
    bulls_heads = herd["bulls"]["eop"]

    # Group 2: Тёлки предыд. = cows_eop for months 1 to (TRANSITION_MONTH-1)
    heifers_prev_heads = [
        herd["cows"]["eop"][t] if timeline["month_index"][t] < TRANSITION_MONTH else 0.0
        for t in range(n)
    ]

    # Group 4: Маточное 12 мес. = cows_eop from month TRANSITION_MONTH onwards
    cows_12m_heads = [
        herd["cows"]["eop"][t] if timeline["month_index"][t] >= TRANSITION_MONTH else 0.0
        for t in range(n)
    ]

    # Group 1: Молодняк (calves after birth — avg from herd)
    calves_heads = herd["calves"]["avg"]

    # Group 3: Тёлки текущего периода — not used until calves split
    heifers_curr_heads = herd["heifers"]["avg"]

    # Group 5: Маточное 9 мес. — inactive in sample
    cows_9m_heads = [0.0] * n

    # Inflation factor per month (annual CPI applied from year 2)
    year_indices = timeline["year_index"]

    def _inflation(t: int) -> float:
        """Price inflation factor for month t. Year 1 = 1.0, Year 2 = 1.11, etc."""
        yi = year_indices[t]
        return (1 + FEED_INFLATION) ** (yi - 1) if yi > 1 else 1.0

    def _calc_group(heads: list, get_ration_fn) -> list:
        """Calculate feeding cost for a group across all months."""
        costs = [0.0] * n
        for t in range(n):
            if heads[t] > 0:
                m = _get_month_in_year(dates[t])
                pasture = _is_pasture_month(0, m)
                ration = get_ration_fn(pasture)
                inf = _inflation(t)
                cost = sum(
                    _feed_cost(p, r, days[t], heads[t], inf)
                    for p, r in ration.values()
                )
                costs[t] = cost
        return costs

    # === Calculate costs per group ===
    group_costs = {}

    # Group 1: Молодняк
    group_costs["molodnyak"] = _calc_group(calves_heads, _get_calves_ration)
    molodnyak = group_costs["molodnyak"]

    # Group 2: Тёлки предыдущего периода
    group_costs["heifers_prev"] = _calc_group(heifers_prev_heads, _get_heifers_prev_ration)
    heifers_prev_cost = group_costs["heifers_prev"]

    # Group 3: Тёлки текущего периода (inactive in 24-month horizon for winter)
    group_costs["heifers_curr"] = [0.0] * n
    heifers_curr_cost = group_costs["heifers_curr"]

    # Group 4: Маточное 12 мес.
    group_costs["cows_12m"] = _calc_group(cows_12m_heads, _get_cows_12m_ration)
    cows_12m_cost = group_costs["cows_12m"]

    # Group 5: Маточное 9 мес.
    group_costs["cows_9m"] = [0.0] * n
    cows_9m_cost = group_costs["cows_9m"]

    # Group 6: Быки-производители
    group_costs["bulls"] = _calc_group(bulls_heads, _get_bulls_ration)
    bulls_cost = group_costs["bulls"]

    # Group 7-8: Доращивание (0 in sample)
    group_costs["fattening_breeding"] = [0.0] * n
    group_costs["fattening_commercial"] = [0.0] * n

    # Total reproducer (groups 1-6)
    total_reproducer = [
        molodnyak[t] + heifers_prev_cost[t] + heifers_curr_cost[t]
        + cows_12m_cost[t] + cows_9m_cost[t] + bulls_cost[t]
        for t in range(n)
    ]

    # Total fattening (groups 7-8)
    total_fattening = [0.0] * n

    return {
        "groups": group_costs,
        "total_reproducer": total_reproducer,
        "total_fattening": total_fattening,
    }
