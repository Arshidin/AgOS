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


def _is_pasture_month(
    calendar_year: int,
    month_in_year: int,
    pasture_start: int = 5,
    pasture_end: int = 10,
) -> bool:
    """True if month_in_year is within the pasture season [start, end].
    Defaults: May–October (Kazakhstan central belt).
    Override via project pasture_start_month / pasture_end_month (ADR-RATION-01).
    """
    return pasture_start <= month_in_year <= pasture_end


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


def _suckling_heads(from_calves: list, t: int, weaning_months: int) -> float:
    """Heads still in the suckling window (0..weaning_months) at month t.

    A calf born in month k is "suckling" during months [k, k+weaning_months-1].
    So at month t the suckling population = Σ from_calves[t-weaning_months+1 .. t].
    Mortality inside the window is ignored (~1.5% over 6 months — negligible).
    """
    start = max(0, t - weaning_months + 1)
    return sum(from_calves[start:t + 1])


def _calc_from_consulting_rations(
    timeline: dict, herd: dict, rations: list, refs: dict,
    pasture_start: int = 5, pasture_end: int = 10,
    weaning_months: int = 6,
) -> dict:
    """Priority 1: Compute feeding costs from attached NASEM ration_versions.

    Supports dual-season format (ADR-RATION-01): results.pasture.total_cost_per_day
    and results.stall.total_cost_per_day. Legacy flat results.total_cost_per_day is
    used for both seasons as fallback.

    Cost formula: cost_per_day × inflation × heads × days / 1000 (→ тыс. тг)
    Inflation (10.5% annual) applied from year 2, same as hardcoded defaults.

    DEF-WEANING-01 (2026-04-17): `herd_turnover.py` distributes calves into
    heifers/steers at birth (`calves.avg = 0` always). Without cohort-aware
    feeding, the SUCKLING_CALF ration was ignored and the HEIFER_YOUNG/STEER
    ration was applied from day 1 → overstated feed COGS by ~4-5M тг/year.
    Fix: split heifers/steers into suckling (first `weaning_months` = 6) and
    weaned portions. Suckling → group_costs["molodnyak"] with SUCKLING_CALF
    ration; weaned → heifers_prev / fattening_commercial as before.
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

    # Build dual-season cost lookup by category_code (DEF-RATION-02)
    ration_by_code: dict[str, dict] = {}  # code → {pasture: float, stall: float}
    for r in rations:
        code = r.get("animal_category_code", "")
        results = r.get("results", {})
        # New dual-season format (ADR-RATION-01)
        if "pasture" in results and "stall" in results:
            cpd_pasture = float(results["pasture"].get("total_cost_per_day", 0.0))
            cpd_stall   = float(results["stall"].get("total_cost_per_day", 0.0))
        else:
            # Legacy flat format — use for both seasons
            flat = float(results.get("total_cost_per_day", 0.0))
            cpd_pasture = flat
            cpd_stall   = flat
        if code and (cpd_pasture or cpd_stall):
            ration_by_code[code] = {"pasture": cpd_pasture, "stall": cpd_stall}

    # Build feed quantities lookup by category_code (DEF-RATION-08)
    # Field names from SimpleRationEditor.tsx handleSave: feed_item_code, quantity_kg_per_day
    ration_items_by_code: dict[str, dict] = {}  # code → {pasture: {feed_code: kg/day}, stall: {feed_code: kg/day}}
    for r in rations:
        code = r.get("animal_category_code", "")
        results = r.get("results", {})
        pasture_items: list = []
        stall_items: list = []
        if "pasture" in results and "stall" in results:
            pasture_items = results["pasture"].get("items", [])
            stall_items   = results["stall"].get("items", [])
        # Build feed_code → kg/day dicts
        p_map: dict[str, float] = {}
        for item in pasture_items:
            # Primary field from SimpleRationEditor: feed_item_code
            # Fallbacks for NASEM CalcDialog or other sources
            fc = item.get("feed_item_code") or item.get("feed_code") or item.get("feed_name", "")
            kg = float(item.get("quantity_kg_per_day", 0) or item.get("kg_per_day", 0))
            if fc and kg > 0:
                p_map[fc] = p_map.get(fc, 0.0) + kg
        s_map: dict[str, float] = {}
        for item in stall_items:
            fc = item.get("feed_item_code") or item.get("feed_code") or item.get("feed_name", "")
            kg = float(item.get("quantity_kg_per_day", 0) or item.get("kg_per_day", 0))
            if fc and kg > 0:
                s_map[fc] = s_map.get(fc, 0.0) + kg
        if code and (p_map or s_map):
            ration_items_by_code[code] = {"pasture": p_map, "stall": s_map}

    def _group_cost(category_codes: list[str], heads: list) -> list:
        pasture_cpd = sum(ration_by_code.get(c, {}).get("pasture", 0.0) for c in category_codes)
        stall_cpd   = sum(ration_by_code.get(c, {}).get("stall",   0.0) for c in category_codes)
        if pasture_cpd == 0.0 and stall_cpd == 0.0:
            return [0.0] * n
        result = []
        for t in range(n):
            m = _get_month_in_year(dates[t])
            cpd = pasture_cpd if _is_pasture_month(0, m, pasture_start, pasture_end) else stall_cpd
            result.append(-(cpd * _inflation(t) * heads[t] * days[t]) / 1000)
        return result

    def _group_quantity(category_codes: list[str], heads: list) -> dict[str, list]:
        """Returns {feed_code: [tons_per_month × n_months]} for a herd group."""
        merged_pasture: dict[str, float] = {}
        merged_stall:   dict[str, float] = {}
        for c in category_codes:
            items = ration_items_by_code.get(c, {})
            for fc, kg in items.get("pasture", {}).items():
                merged_pasture[fc] = merged_pasture.get(fc, 0.0) + kg
            for fc, kg in items.get("stall", {}).items():
                merged_stall[fc] = merged_stall.get(fc, 0.0) + kg

        all_feeds = set(merged_pasture) | set(merged_stall)
        if not all_feeds:
            return {}

        result: dict[str, list] = {fc: [] for fc in all_feeds}
        for t in range(n):
            m = _get_month_in_year(dates[t])
            is_p = _is_pasture_month(0, m, pasture_start, pasture_end)
            feed_map = merged_pasture if is_p else merged_stall
            h = heads[t] if t < len(heads) else 0.0
            d = days[t]
            for fc in all_feeds:
                kg_day = feed_map.get(fc, 0.0)
                tons = (kg_day * h * d) / 1000.0
                result[fc].append(tons)
        return result

    # DEF-WEANING-01: split heifers/steers into suckling vs weaned.
    # Suckling heads = inflow in last `weaning_months` months (tracked via
    # herd.heifers.from_calves / herd.steers.from_calves).
    heifers_from_calves = herd["heifers"].get("from_calves", [0.0] * n)
    steers_from_calves  = herd["steers"].get("from_calves",  [0.0] * n)
    heifers_avg_all = herd["heifers"]["avg"]
    steers_avg_all  = herd["steers"]["avg"]

    suckling_heifers = [_suckling_heads(heifers_from_calves, t, weaning_months) for t in range(n)]
    suckling_steers  = [_suckling_heads(steers_from_calves,  t, weaning_months) for t in range(n)]
    # Weaned = total avg − suckling portion; clamp at 0 for safety.
    weaned_heifers = [max(0.0, heifers_avg_all[t] - suckling_heifers[t]) for t in range(n)]
    weaned_steers  = [max(0.0, steers_avg_all[t]  - suckling_steers[t])  for t in range(n)]
    # Combined suckling population = young stock fed with SUCKLING_CALF ration.
    molodnyak_heads = [suckling_heifers[t] + suckling_steers[t] for t in range(n)]

    group_costs: dict[str, list] = {}
    # molodnyak: suckling portion of young stock (NEW — uses heifers+steers inflow,
    # not the always-zero herd.calves.avg).
    group_costs["molodnyak"]          = _group_cost(["SUCKLING_CALF", "YOUNG_CALF"], molodnyak_heads)
    # heifers_prev: weaned heifers only (HEIFER_PREG+HEIFER_YOUNG share heifers pool).
    group_costs["heifers_prev"]       = _group_cost(["HEIFER_PREG", "HEIFER_YOUNG"], weaned_heifers)
    group_costs["heifers_curr"]       = [0.0] * n
    group_costs["cows_12m"]           = _group_cost(["COW"],           herd["cows"]["eop"])
    group_costs["cows_9m"]            = [0.0] * n
    group_costs["bulls"]              = _group_cost(["BULL_BREEDING"],  herd["bulls"]["eop"])
    # fattening_*: weaned steers only (BULL_CALF/STEER share steers pool).
    group_costs["fattening_breeding"] = _group_cost(["BULL_CALF"],     weaned_steers)
    group_costs["fattening_commercial"] = _group_cost(["STEER"],       weaned_steers)

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

    # DEF-RATION-08 + DEF-WEANING-01: physical quantities by suckling/weaned split.
    qty_by_group: dict[str, dict[str, list]] = {}
    qty_by_group["molodnyak"]            = _group_quantity(["SUCKLING_CALF", "YOUNG_CALF"], molodnyak_heads)
    qty_by_group["heifers_prev"]         = _group_quantity(["HEIFER_PREG", "HEIFER_YOUNG"], weaned_heifers)
    qty_by_group["heifers_curr"]         = {}
    qty_by_group["cows_12m"]             = _group_quantity(["COW"],           herd["cows"]["eop"])
    qty_by_group["cows_9m"]              = {}
    qty_by_group["bulls"]                = _group_quantity(["BULL_BREEDING"],  herd["bulls"]["eop"])
    qty_by_group["fattening_breeding"]   = _group_quantity(["BULL_CALF"],     weaned_steers)
    qty_by_group["fattening_commercial"] = _group_quantity(["STEER"],         weaned_steers)

    # Aggregate totals_by_feed across all groups
    all_feed_codes: set[str] = set()
    for gq in qty_by_group.values():
        all_feed_codes.update(gq.keys())

    totals_by_feed: dict[str, list] = {}
    for fc in all_feed_codes:
        monthly = [0.0] * n
        for gq in qty_by_group.values():
            if fc in gq:
                for t in range(n):
                    monthly[t] += gq[fc][t]
        totals_by_feed[fc] = monthly

    # annual_feed_summary: {feed_code: [tons_year_1, ..., tons_year_10]}
    annual_feed_summary: dict[str, list] = {}
    for fc, monthly in totals_by_feed.items():
        annual: list = []
        for yr in range(10):
            start = yr * 12
            end = min(start + 12, n)
            annual.append(round(sum(monthly[start:end]), 2))
        annual_feed_summary[fc] = annual

    return {
        "groups": group_costs,
        "total_reproducer": total_reproducer,
        "total_fattening": total_fattening,
        "_source": "consulting_rations",
        "quantities": {"by_group": qty_by_group, "totals_by_feed": totals_by_feed},
        "annual_feed_summary": annual_feed_summary,
        "annual_feed_cost_summary": _build_annual_cost_summary(total_reproducer, total_fattening, n),
    }


def _calc_from_norms(
    timeline: dict, herd: dict, norms: list, feed_prices: list, refs: dict,
    pasture_start: int = 5, pasture_end: int = 10,
    weaning_months: int = 6,
) -> dict:
    """Priority 2: Compute feeding costs from feed_consumption_norms + feed_prices_d03.

    DEF-FEED-NORMS-01 (2026-04-17): norms are mapped to herd groups via
    animal_categories.code (embedded from calculate.py select join) and
    CATEGORY_CODE_TO_HERD. The previous heuristic ("reproducer" substring in
    farm_type → sum into cows_12m+bulls) double-counted: for project with 8
    reproducer norms it inflated cows_12m year-1 cost ~7× (100M vs ~14M).

    Norm record shape (post-fix, see calculate.py):
      { animal_category_id, animal_categories: {code}, season, farm_type,
        items: [{feed_item_id, kg_per_day}] }

    Cost formula: Σ(price_per_kg × inflation × kg_per_day × heads × days) / 1000
    Season: 'summer' (pasture May-Oct) / 'winter' (stall Nov-Apr) /
    'transition' used as fallback when season-specific norm missing.
    """
    n = timeline["horizon_months"]
    dates = timeline["dates"]
    days = list(timeline["days_in_month"])
    year_indices = timeline["year_index"]

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

    # feed_item_id → price_per_kg (first price wins)
    price_map: dict[str, float] = {}
    for fp in feed_prices:
        fid = fp.get("feed_item_id") or ""
        price = fp.get("price_per_kg", 0.0)
        if fid and price and fid not in price_map:
            price_map[fid] = float(price)

    # Map: (category_code, season) → cpd (тг/голова/сут)
    # Uses embedded animal_categories.code from PostgREST select.
    cpd_by_code_season: dict[tuple[str, str], float] = {}
    for norm in norms:
        ac = norm.get("animal_categories") or {}
        code = ac.get("code") if isinstance(ac, dict) else ""
        if not code:
            continue
        season = norm.get("season") or ""
        if not season:
            continue
        items = norm.get("items") or []
        if isinstance(items, str):
            # Some drivers return JSON as string
            import json as _json
            try:
                items = _json.loads(items)
            except Exception:
                items = []
        cpd = sum(
            price_map.get(item.get("feed_item_id", ""), 0.0) * float(item.get("kg_per_day", 0) or 0)
            for item in items
        )
        if cpd > 0:
            cpd_by_code_season[(code, season)] = cpd

    def _lookup_cpd(code: str, is_pasture: bool) -> float:
        """Pick cpd for (code, season). Fallback: transition → opposite season → 0."""
        season = "summer" if is_pasture else "winter"
        cpd = cpd_by_code_season.get((code, season))
        if cpd is None or cpd == 0.0:
            cpd = cpd_by_code_season.get((code, "transition"))
        if cpd is None or cpd == 0.0:
            alt = "winter" if is_pasture else "summer"
            cpd = cpd_by_code_season.get((code, alt))
        return cpd or 0.0

    # DEF-WEANING-01: split heifers/steers into suckling vs weaned, mirror Priority 1.
    n_ = n  # alias for list-comprehension readability
    heifers_from_calves = herd["heifers"].get("from_calves", [0.0] * n_)
    steers_from_calves  = herd["steers"].get("from_calves",  [0.0] * n_)
    heifers_avg_all = herd["heifers"]["avg"]
    steers_avg_all  = herd["steers"]["avg"]
    suckling_heifers = [_suckling_heads(heifers_from_calves, t, weaning_months) for t in range(n_)]
    suckling_steers  = [_suckling_heads(steers_from_calves,  t, weaning_months) for t in range(n_)]
    weaned_heifers = [max(0.0, heifers_avg_all[t] - suckling_heifers[t]) for t in range(n_)]
    weaned_steers  = [max(0.0, steers_avg_all[t]  - suckling_steers[t])  for t in range(n_)]
    molodnyak_heads = [suckling_heifers[t] + suckling_steers[t] for t in range(n_)]

    # Group → [codes, heads_array]. Mirrors _calc_from_consulting_rations.
    group_specs: list[tuple[str, list[str], list]] = [
        ("molodnyak",            ["SUCKLING_CALF", "YOUNG_CALF"],     molodnyak_heads),
        ("heifers_prev",         ["HEIFER_PREG", "HEIFER_YOUNG"],     weaned_heifers),
        ("heifers_curr",         [],                                   weaned_heifers),
        ("cows_12m",             ["COW"],                              herd["cows"]["eop"]),
        ("cows_9m",              [],                                   herd["cows"]["eop"]),
        ("bulls",                ["BULL_BREEDING"],                    herd["bulls"]["eop"]),
        ("fattening_breeding",   ["BULL_CALF"],                        weaned_steers),
        ("fattening_commercial", ["STEER"],                            weaned_steers),
    ]

    group_costs: dict[str, list] = {g: [0.0] * n for g, _, _ in group_specs}

    for t in range(n):
        m = _get_month_in_year(dates[t])
        is_pasture = _is_pasture_month(0, m, pasture_start, pasture_end)
        inf = _inflation(t)
        for gkey, codes, heads_arr in group_specs:
            if not codes:
                continue
            heads = heads_arr[t] if t < len(heads_arr) else 0.0
            if heads <= 0:
                continue
            # Sum cpd across all codes in the group (e.g. HEIFER_PREG+HEIFER_YOUNG share heifers pool —
            # picking the bigger of the two avoids double-counting one head across two categories).
            # For robustness: take max cpd, not sum — mirrors "one animal eats one ration per season".
            cpd = max((_lookup_cpd(c, is_pasture) for c in codes), default=0.0)
            if cpd <= 0:
                continue
            group_costs[gkey][t] += -(cpd * inf * heads * days[t]) / 1000

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
    weaning = int(enriched_input.get("weaning_months", 6) or 6)

    # Priority 1: consulting_rations — NASEM-computed costs per head per day
    consulting_rations = refs.get("consulting_rations", [])
    if consulting_rations:
        return _calc_from_consulting_rations(
            timeline, herd, consulting_rations, refs,
            pasture_start=enriched_input.get("pasture_start_month", 5),
            pasture_end=enriched_input.get("pasture_end_month", 10),
            weaning_months=weaning,
        )

    # Priority 2: feed_consumption_norms from d03_feed
    feed_norms = refs.get("feed_consumption_norms", [])
    feed_prices_d03 = refs.get("feed_prices_d03", [])
    if feed_norms and feed_prices_d03:
        return _calc_from_norms(
            timeline, herd, feed_norms, feed_prices_d03, refs,
            pasture_start=enriched_input.get("pasture_start_month", 5),
            pasture_end=enriched_input.get("pasture_end_month", 10),
            weaning_months=weaning,
        )

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

    # Group 1: Молодняк — DEF-WEANING-01: herd["calves"]["avg"] is always 0 because
    # herd_turnover.py distributes calves to heifers/steers at birth. Mirror P1/P2:
    # suckling = inflow into heifers+steers in last `weaning` months.
    _hf_fc = herd["heifers"].get("from_calves", [0.0] * n)
    _st_fc = herd["steers"].get("from_calves",  [0.0] * n)
    calves_heads = [
        _suckling_heads(_hf_fc, t, weaning) + _suckling_heads(_st_fc, t, weaning)
        for t in range(n)
    ]

    # Group 3: Тёлки текущего периода — not used until calves split
    heifers_curr_heads = herd["heifers"]["avg"]

    # Group 5: Маточное 9 мес. — inactive in sample
    cows_9m_heads = [0.0] * n

    # Inflation factor per month (annual CPI applied from year 2)
    year_indices = timeline["year_index"]

    # ADR-RATION-01: project-specific pasture season (Fix #3)
    pasture_start_p3 = enriched_input.get("pasture_start_month", 5)
    pasture_end_p3   = enriched_input.get("pasture_end_month", 10)

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
                pasture = _is_pasture_month(0, m, pasture_start_p3, pasture_end_p3)
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
