"""Resolver для livestock sale prices — ADR-PRICES-01 (2026-04-18).

Priority chain для каждой категории (steer_own, heifer_breeding, cow_culled,
bull_culled):

    P1: project override — ProjectInput.price_*_per_kg не None
    P2: DB reference — consulting_reference_data, category='livestock_prices'
    P3: safety default — hardcoded (предыдущие defaults из DEF-REVENUE-PRICES-01)

Вход/выход — dict в формате enriched_input["price_params"] (ключи без префикса
`price_` и без суффикса `_per_kg`).
"""

# Fallback constants — used only when DB reference is empty (pre-seed deploys,
# catastrophic data loss). Match prior DEF-REVENUE-PRICES-01 Pydantic defaults.
SAFETY_DEFAULTS = {
    "steer_own": 1800.0,
    "heifer_breeding": 2200.0,
    "cow_culled": 1800.0,
    "bull_culled": 2000.0,
}

CATEGORIES = list(SAFETY_DEFAULTS.keys())


def resolve_price_params(
    raw_prices: dict,
    refs: dict,
    project_year: int,
) -> tuple[dict, dict]:
    """Разрешает цены продажи по 3-уровневой Priority chain.

    Args:
        raw_prices: dict из enriched_input["price_params"] с возможными None
                    (P2 signal). Формат: {"steer_own": None, ...}
        refs: dict справочников по категориям (orchestrator._group_references).
              Ожидается refs["livestock_prices"] = list of rows с jsonb data.
        project_year: год старта проекта (для будущего year-matching).

    Returns:
        (resolved_prices, priority_used) — где:
            resolved_prices: dict с 4 ключами, все float (нет None)
            priority_used: dict с 4 ключами, значения 1/2/3 (какой уровень сработал)
    """
    db_rows = refs.get("livestock_prices", []) or []

    # Build DB lookup: {livestock_category: (year, price_per_kg)}.
    # MVP: region_id and age_months must be None (catalog baseline).
    # If multiple years present, pick max year <= project_year.
    db_prices: dict[str, tuple[int, float]] = {}
    for row in db_rows:
        data = row.get("data", {}) or {}
        cat = data.get("livestock_category")
        year = data.get("year")
        region_id = data.get("region_id")
        age_months = data.get("age_months")
        price = data.get("price_per_kg")

        # MVP filters: global catalog (no region, no age)
        if region_id is not None or age_months is not None:
            continue
        if not cat or cat not in CATEGORIES:
            continue
        if price is None:
            continue
        try:
            price_f = float(price)
            year_i = int(year) if year is not None else 0
        except (TypeError, ValueError):
            continue
        if price_f <= 0:
            continue

        # Pick year closest-but-not-after project_year. Ignore future years.
        if year_i > project_year:
            continue
        existing = db_prices.get(cat)
        if existing is None or year_i > existing[0]:
            db_prices[cat] = (year_i, price_f)

    resolved: dict[str, float] = {}
    priority_used: dict[str, int] = {}
    for cat in CATEGORIES:
        override = raw_prices.get(cat)
        if override is not None:
            resolved[cat] = float(override)
            priority_used[cat] = 1
        elif cat in db_prices:
            resolved[cat] = db_prices[cat][1]
            priority_used[cat] = 2
        else:
            resolved[cat] = SAFETY_DEFAULTS[cat]
            priority_used[cat] = 3

    return resolved, priority_used
