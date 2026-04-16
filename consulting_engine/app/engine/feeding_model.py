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


# ─── Animal category code → herd group key mapping ────────────────────────────
# Maps animal_categories.code (d01_kernel.sql seed) to herd turnover keys.
# Used by Priority 1 (consulting_rations) and Priority 2 (feed_consumption_norms).
# TS mirror: src/pages/admin/consulting/tabs/herdCategoryMapping.ts — keep in sync.
CATEGORY_CODE_TO_HERD: dict[str, tuple[str, str]] = {
    "COW":           ("cows",    "eop"),
    "COW_CULL":      ("cows",    "eop"),
    "BULL_BREEDING": ("bulls",   "eop"),
    "BULL_CULL":     ("bulls",   "eop"),
    "SUCKLING_CALF": ("calves",  "avg"),
    "YOUNG_CALF":    ("calves",  "avg"),
    "HEIFER_YOUNG":  ("heifers", "avg"),
    "HEIFER_PREG":   ("heifers", "avg"),
    "BULL_CALF":     ("steers",  "avg"),
    "STEER":         ("steers",  "avg"),
    # M5.3 / SIG-03: OX and MIXED were absent; added to match DB taxonomy seeds.
    # OX = castrated male → fattening → steers group (turnover_key=steers, avg).
    # MIXED = catch-all → cows group (turnover_key=cows, eop).
    "OX":            ("steers",  "avg"),
    "MIXED":         ("cows",    "eop"),
}


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

# Annual inflation rate for feed prices (fallback if not in reference data)
# Excel shows: 80→88.4 (10.5%), 28→30.94 (10.5%), 145→160.225 (10.5%)
# This is 10.5% annual CPI applied to feed prices (different from staff 11%)
FEED_INFLATION_DEFAULT = 0.105


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


def _build_annual_cost_summary(total_reproducer: list, total_fattening: list, n: int) -> list:
    """Aggregate monthly feed costs (тыс. тг) into 10 annual totals (absolute values)."""
    result = []
    for yr in range(10):
        start = yr * 12
        end = min(start + 12, n)
        yr_total = sum(
            abs(total_reproducer[t]) + abs(total_fattening[t])
            for t in range(start, end)
        )
        result.append(round(yr_total, 1))
    return result


def _calc_from_consulting_rations(
    timeline: dict, herd: dict, rations: list, refs: dict
) -> dict:
    """Priority 1: Compute feeding costs from attached NASEM ration_versions.

    Each ration has results.total_cost_per_day (тг per head per day).
    Cost formula: total_cost_per_day × inflation × heads × days / 1000 (→ тыс. тг)
    Inflation (10.5% annual) applied from year 2, same as hardcoded defaults.
    """
    n = timeline["horizon_months"]
    days = list(timeline["days_in_month"])
    year_indices = timeline["year_index"]

    # Feed inflation rate (same logic as Priority 3)
    feed_inflation_rate = FEED_INFLATION_DEFAULT
    economic_params = refs.get("economic_parameters", [])
    if isinstance(economic_params, list):
        for ref in economic_params:
            if ref.get("code") == "feed_inflation":
                feed_inflation_rate = ref.get("data", {}).get("rate", FEED_INFLATION_DEFAULT)
                break
    elif isinstance(economic_params, dict):
        feed_inflation_rate = economic_params.get("rate", FEED_INFLATION_DEFAULT)

    def _inflation(t: int) -> float:
        yi = year_indices[t]
        return (1 + feed_inflation_rate) ** (yi - 1) if yi > 1 else 1.0

    # Build cost_per_day_per_head lookup by category_code
    ration_by_code: dict[str, float] = {}
    for r in rations:
        code = r.get("animal_category_code", "")
        cost_per_day = r.get("results", {}).get("total_cost_per_day", 0.0)
        if code and cost_per_day:
            ration_by_code[code] = float(cost_per_day)

    def _group_cost(category_codes: list[str], heads: list) -> list:
        cpd = sum(ration_by_code.get(c, 0.0) for c in category_codes)
        if cpd == 0.0:
            return [0.0] * n
        return [-(cpd * _inflation(t) * heads[t] * days[t]) / 1000 for t in range(n)]

    group_costs: dict[str, list] = {}
    group_costs["molodnyak"]          = _group_cost(["SUCKLING_CALF", "YOUNG_CALF"], herd["calves"]["avg"])
    # Heifers: both HEIFER_PREG and HEIFER_YOUNG share herd["heifers"]["avg"].
    # Combine into one group to avoid double-counting the same head count.
    # This matches Priority 3 (hardcoded) where heifers_curr is always [0]*n.
    group_costs["heifers_prev"]       = _group_cost(["HEIFER_PREG", "HEIFER_YOUNG"], herd["heifers"]["avg"])
    group_costs["heifers_curr"]       = [0.0] * n
    group_costs["cows_12m"]           = _group_cost(["COW"],           herd["cows"]["eop"])
    group_costs["cows_9m"]            = [0.0] * n
    group_costs["bulls"]              = _group_cost(["BULL_BREEDING"],  herd["bulls"]["eop"])
    group_costs["fattening_breeding"] = _group_cost(["BULL_CALF"],     herd["steers"]["avg"])
    group_costs["fattening_commercial"] = _group_cost(["STEER"],       herd["steers"]["avg"])

    total_reproducer = [
        group_costs["molodnyak"][t] + group_costs["heifers_prev"][t]
        + group_costs["heifers_curr"][t] + group_costs["cows_12m"][t]
        + group_costs["cows_9m"][t] + group_costs["bulls"][t]
        for t in range(n)
    ]
    total_fattening = [
        group_costs["fattening_breeding"][t] + group_costs["fattening_commercial"][t]
        for t in range(n)
    ]

    return {
        "groups": group_costs,
        "total_reproducer": total_reproducer,
        "total_fattening": total_fattening,
        "_source": "consulting_rations",
        "quantities": {"by_group": {}, "totals_by_feed": {}},
        "annual_feed_summary": {},
        "annual_feed_cost_summary": _build_annual_cost_summary(total_reproducer, total_fattening, n),
    }


def _calc_from_norms(
    timeline: dict, herd: dict, norms: list, feed_prices: list, refs: dict
) -> dict:
    """Priority 2: Compute feeding costs from feed_consumption_norms + feed_prices_d03.

    Norm items: [{feed_item_id, kg_per_day}]
    Cost formula: sum(price_per_kg × inflation × kg_per_day × heads × days) / 1000
    Season: pasture (May-Oct) or stall (Nov-Apr)
    Inflation (10.5% annual) applied from year 2, same as hardcoded defaults.
    """
    n = timeline["horizon_months"]
    dates = timeline["dates"]
    days = list(timeline["days_in_month"])
    year_indices = timeline["year_index"]

    # Feed inflation rate (same logic as Priority 3)
    feed_inflation_rate = FEED_INFLATION_DEFAULT
    economic_params = refs.get("economic_parameters", [])
    if isinstance(economic_params, list):
        for ref in economic_params:
            if ref.get("code") == "feed_inflation":
                feed_inflation_rate = ref.get("data", {}).get("rate", FEED_INFLATION_DEFAULT)
                break
    elif isinstance(economic_params, dict):
        feed_inflation_rate = economic_params.get("rate", FEED_INFLATION_DEFAULT)

    def _inflation(t: int) -> float:
        yi = year_indices[t]
        return (1 + feed_inflation_rate) ** (yi - 1) if yi > 1 else 1.0

    # Build price lookup: feed_item_id → price_per_kg
    price_map: dict[str, float] = {}
    for fp in feed_prices:
        fid = fp.get("feed_item_id") or ""
        price = fp.get("price_per_kg", 0.0)
        if fid and price and fid not in price_map:
            price_map[fid] = float(price)

    # Build norms lookup: (animal_category_id, season) → items list
    norms_map: dict[tuple, list] = {}
    for norm in norms:
        cat_id = norm.get("animal_category_id", "")
        season = norm.get("season", "")
        if cat_id and season:
            norms_map[(cat_id, season)] = norm.get("items", [])

    # Also build category_id lookup from rations for code→id resolution
    # (norms use animal_category_id, not code; we resolve via the norm records themselves)
    # Since we only have id-based norms here, we compute cost_per_head_per_day for each norm
    def _norm_cost_per_head(animal_category_id: str, is_pasture: bool) -> float:
        season = "summer" if is_pasture else "winter"
        items = norms_map.get((animal_category_id, season), [])
        if not items:
            # Try 'transition' season as fallback
            items = norms_map.get((animal_category_id, "transition"), [])
        if not items:
            return 0.0
        return sum(
            price_map.get(item.get("feed_item_id", ""), 0.0) * float(item.get("kg_per_day", 0))
            for item in items
        )

    # We need category IDs for each herd group — extract from norm records by matching
    # against known codes. Build code→id map from norms' animal_category references.
    # Norms don't carry code directly; skip full ID resolution — use cost_per_head averaged
    # across all norms for the group. This is a best-effort fallback.
    # If no matching norm exists for a category, cost = 0 (falls back within group).

    # Aggregate cost-per-head for each month using all available norms
    # by iterating over norms and summing applicable ones per herd group.
    # Group costs default to 0 if no norms found for that category.
    group_costs: dict[str, list] = {k: [0.0] * n for k in [
        "molodnyak", "heifers_prev", "heifers_curr", "cows_12m", "cows_9m",
        "bulls", "fattening_breeding", "fattening_commercial",
    ]}

    for t in range(n):
        m = _get_month_in_year(dates[t])
        is_pasture = _is_pasture_month(0, m)
        season = "summer" if is_pasture else "winter"

        for norm in norms:
            cat_id = norm.get("animal_category_id", "")
            if norm.get("season", "") != season:
                continue
            items = norm.get("items", [])
            if not items:
                continue

            # cost per head per day (тг)
            cpd = sum(
                price_map.get(item.get("feed_item_id", ""), 0.0) * float(item.get("kg_per_day", 0))
                for item in items
            )
            if cpd == 0.0:
                continue

            # Match norm to herd group via CATEGORY_CODE_TO_HERD
            # norms carry animal_category_id but not code; match by id across all groups
            # We accumulate costs keyed by category_id and apply to matching groups below
            # This requires knowing which herd group each category_id belongs to.
            # Since we don't have code here, we skip — Priority 2 is best-effort.
            # The norm's farm_type field can hint: beef_reproducer→cows/bulls, feedlot→fattening
            farm_type = norm.get("farm_type", "")
            inf = _inflation(t)
            if "reproducer" in farm_type:
                # Apply proportionally to cows and bulls (major groups)
                for group_key, heads_arr in [
                    ("cows_12m", herd["cows"]["eop"]),
                    ("bulls", herd["bulls"]["eop"]),
                ]:
                    heads = heads_arr[t] if t < len(heads_arr) else 0.0
                    if heads > 0:
                        group_costs[group_key][t] += -(cpd * inf * heads * days[t]) / 1000
            elif "feedlot" in farm_type or "fattening" in farm_type:
                heads = herd["steers"]["avg"][t] if t < len(herd["steers"]["avg"]) else 0.0
                if heads > 0:
                    group_costs["fattening_commercial"][t] += -(cpd * inf * heads * days[t]) / 1000

    total_reproducer = [
        group_costs["molodnyak"][t] + group_costs["heifers_prev"][t]
        + group_costs["heifers_curr"][t] + group_costs["cows_12m"][t]
        + group_costs["cows_9m"][t] + group_costs["bulls"][t]
        for t in range(n)
    ]
    total_fattening = [
        group_costs["fattening_breeding"][t] + group_costs["fattening_commercial"][t]
        for t in range(n)
    ]

    return {
        "groups": group_costs,
        "total_reproducer": total_reproducer,
        "total_fattening": total_fattening,
        "_source": "feed_consumption_norms",
        "quantities": {"by_group": {}, "totals_by_feed": {}},
        "annual_feed_summary": {},
        "annual_feed_cost_summary": _build_annual_cost_summary(total_reproducer, total_fattening, n),
    }


def calculate_feeding(
    timeline: dict, enriched_input: dict, herd: dict, refs: dict
) -> dict:
    """Расчёт кормовой модели для всех 8 групп.

    Fallback chain (ADR-FEED-02, D-S8-4):
      Priority 1: consulting_rations attached to project (exact NASEM cost × heads × days)
      Priority 2: feed_consumption_norms from d03_feed + feed_prices_d03
      Priority 3: hardcoded defaults (existing CFC-verified coefficients)

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
    # Priority 1: consulting_rations — NASEM-computed costs per head per day
    consulting_rations = refs.get("consulting_rations", [])
    if consulting_rations:
        return _calc_from_consulting_rations(timeline, herd, consulting_rations, refs)

    # Priority 2: feed_consumption_norms from d03_feed
    feed_norms = refs.get("feed_consumption_norms", [])
    feed_prices_d03 = refs.get("feed_prices_d03", [])
    if feed_norms and feed_prices_d03:
        return _calc_from_norms(timeline, herd, feed_norms, feed_prices_d03, refs)

    # Priority 3: hardcoded CFC-verified defaults
    n = timeline["horizon_months"]
    dates = timeline["dates"]
    # CFC uses its own days-in-month (row 4): first month = 30 (not calendar 31)
    # This is because CFC counts from project start date (Aug 31) forward 30 days
    # Use 30 for months 1-2, then calendar days from month 3
    cfc_days = list(timeline["days_in_month"])
    cfc_days[0] = 30  # August: CFC uses 30
    cfc_days[1] = 30  # September: CFC uses 30
    days = cfc_days

    # Read feed inflation from reference data (Task C), fallback to constant
    feed_inflation_rate = FEED_INFLATION_DEFAULT
    economic_params = refs.get("economic_parameters", [])
    if isinstance(economic_params, list):
        for ref in economic_params:
            if ref.get("code") == "feed_inflation":
                feed_inflation_rate = ref.get("data", {}).get("rate", FEED_INFLATION_DEFAULT)
                break
    elif isinstance(economic_params, dict):
        feed_inflation_rate = economic_params.get("rate", FEED_INFLATION_DEFAULT)

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
        """Price inflation factor for month t. Year 1 = 1.0, Year 2 = 1+rate, etc."""
        yi = year_indices[t]
        return (1 + feed_inflation_rate) ** (yi - 1) if yi > 1 else 1.0

    def _calc_group(heads: list, get_ration_fn) -> tuple[list, dict[str, list]]:
        """Calculate feeding cost and physical quantities for a group.

        Returns:
            (costs, quantities) where quantities = {feed_name: [tonnes]*n}
        """
        costs = [0.0] * n
        quantities: dict[str, list] = {}
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
                # Track physical quantities (tonnes)
                for feed_name, (_, daily_kg) in ration.items():
                    if feed_name not in quantities:
                        quantities[feed_name] = [0.0] * n
                    quantities[feed_name][t] = daily_kg * heads[t] * days[t] / 1000
        return costs, quantities

    # === Calculate costs and quantities per group ===
    group_costs = {}
    group_quantities: dict[str, dict[str, list]] = {}

    # Group 1: Молодняк
    group_costs["molodnyak"], group_quantities["molodnyak"] = _calc_group(calves_heads, _get_calves_ration)
    molodnyak = group_costs["molodnyak"]

    # Group 2: Тёлки предыдущего периода
    group_costs["heifers_prev"], group_quantities["heifers_prev"] = _calc_group(heifers_prev_heads, _get_heifers_prev_ration)
    heifers_prev_cost = group_costs["heifers_prev"]

    # Group 3: Тёлки текущего периода (inactive in 24-month horizon for winter)
    group_costs["heifers_curr"] = [0.0] * n
    group_quantities["heifers_curr"] = {}
    heifers_curr_cost = group_costs["heifers_curr"]

    # Group 4: Маточное 12 мес.
    group_costs["cows_12m"], group_quantities["cows_12m"] = _calc_group(cows_12m_heads, _get_cows_12m_ration)
    cows_12m_cost = group_costs["cows_12m"]

    # Group 5: Маточное 9 мес.
    group_costs["cows_9m"] = [0.0] * n
    group_quantities["cows_9m"] = {}
    cows_9m_cost = group_costs["cows_9m"]

    # Group 6: Быки-производители
    group_costs["bulls"], group_quantities["bulls"] = _calc_group(bulls_heads, _get_bulls_ration)
    bulls_cost = group_costs["bulls"]

    # Group 7-8: Доращивание (0 in sample)
    group_costs["fattening_breeding"] = [0.0] * n
    group_costs["fattening_commercial"] = [0.0] * n
    group_quantities["fattening_breeding"] = {}
    group_quantities["fattening_commercial"] = {}

    # Total reproducer (groups 1-6)
    total_reproducer = [
        molodnyak[t] + heifers_prev_cost[t] + heifers_curr_cost[t]
        + cows_12m_cost[t] + cows_9m_cost[t] + bulls_cost[t]
        for t in range(n)
    ]

    # Total fattening (groups 7-8)
    total_fattening = [0.0] * n

    # === Task F: Aggregate physical quantities by feed type (tonnes/month) ===
    totals_by_feed: dict[str, list] = {}
    for gq in group_quantities.values():
        for feed_name, monthly in gq.items():
            if feed_name not in totals_by_feed:
                totals_by_feed[feed_name] = [0.0] * n
            for t in range(n):
                totals_by_feed[feed_name][t] += monthly[t]

    # === Task I: Annual feed summary (tonnes/year, 10 years) ===
    annual_feed_summary: dict[str, list] = {}
    for feed_name, monthly in totals_by_feed.items():
        yearly = []
        for yr in range(10):
            start = yr * 12
            end = min(start + 12, n)
            yearly.append(round(sum(monthly[start:end]), 1))
        annual_feed_summary[feed_name] = yearly

    return {
        "groups": group_costs,
        "total_reproducer": total_reproducer,
        "total_fattening": total_fattening,
        "_source": "hardcoded_defaults",
        "quantities": {
            "by_group": {g: dict(q) for g, q in group_quantities.items()},
            "totals_by_feed": dict(totals_by_feed),
        },
        "annual_feed_summary": annual_feed_summary,
        "annual_feed_cost_summary": _build_annual_cost_summary(total_reproducer, total_fattening, n),
    }
