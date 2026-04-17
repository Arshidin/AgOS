"""Модуль выручки + субсидий (Часть 4.8.1-4.8.2).

Revenue sources (all in тыс. тенге):
  Тёлки племенные    — sold_breeding × heifer_transfer_weight × price_heifer_breeding × inflation / 1000
  Маточное выбракованное — abs(culled_cows) × cow_culled_weight × price_cow_culled × inflation / 1000
  Быки выбракованные — abs(culled_bulls) × bull_culled_weight × price_bull_culled × inflation / 1000
  Собственные бычки  — abs(steers_sold) × steer_sale_weight × price_steer_own × inflation / 1000

Веса:
  - Молодняк (бычки, тёлки) — динамически из weight_model (birth + Σ daily_gain × days)
  - Выбракованные (коровы, быки) — статично из weight_params (параметр проекта)

Цены:
  - Из enriched_input["price_params"] (параметр проекта, P8 — not hardcode)

Subsidies (subsidy_switch != 2):
  Закуп поголовья — 260 тыс.тг × (purchased_cows + purchased_bulls), month 1 only
  Выращивание племенного молодняка — 15 тыс.тг × inflation × sold_breeding_heifers
  Содержание быков — 100 тыс.тг × bulls_eop × inflation, every month

Inflation: configurable via `enriched_input["cpi_annual"]` (default 10.5%),
applied from year 2 onward. Same rate applies to livestock sale prices AND
breeding subsidy (MSH KZ indexes subsidy with CPI).
"""


def calculate_revenue(
    timeline: dict, enriched_input: dict, herd: dict, refs: dict,
    weight: dict | None = None,
) -> dict:
    """Расчёт выручки от продажи КРС + субсидии.

    All output arrays are 120-element monthly series in тыс. тенге.
    Revenue values are POSITIVE.

    Args:
        timeline: temporal axis (120 months)
        enriched_input: validated project parameters
        herd: herd turnover results with cows/bulls/heifers/steers sub-dicts
        refs: reference data (unused here, kept for signature compatibility)
        weight: dynamic weight model results (steer_sale_weight, heifer_transfer_weight,
                cow_culled_weight, bull_culled_weight). Expected to be populated for every
                month where sales occur — raises ValueError on missing young-animal weights.

    Returns:
        dict with livestock_revenue, subsidies, total_revenue arrays
    """
    n = timeline["horizon_months"]
    year_idx = timeline["year_index"]
    subsidy_switch = enriched_input.get("subsidy_switch", 1)

    # Цены — из параметров проекта (P8). price_params всегда есть в enriched_input.
    prices = enriched_input["price_params"]

    # Годовая инфляция цен — параметр проекта (DEF-CPI-PARAM-01).
    cpi_annual = enriched_input["cpi_annual"]

    # Веса выбракованных — статично из weight_params (коровы/быки — зрелые).
    # Fallback на STEER_WEIGHT/HEIFER_WEIGHT убран: в норме weight_model всегда
    # заполняет steer_sale_weight/heifer_transfer_weight для месяцев с продажей.
    # Если не заполнил — это баг, ловим через assertion, а не маскируем завышением.
    wp = enriched_input["weight_params"]
    cow_culled_wt = weight["cow_culled_weight"] if weight else wp["cow_culled_weight_kg"]
    bull_culled_wt = weight["bull_culled_weight"] if weight else wp["bull_culled_weight_kg"]

    livestock_revenue = [0.0] * n
    subsidies = [0.0] * n

    # Per-category detail arrays
    rev_heifers = [0.0] * n
    rev_cows_culled = [0.0] * n
    rev_bulls_culled = [0.0] * n
    rev_steers = [0.0] * n
    sub_purchase = [0.0] * n
    sub_breeding = [0.0] * n
    sub_bulls = [0.0] * n

    for t in range(n):
        # Inflation factor: year 1 = 1.0, year 2 = 1 + cpi, year 3 = (1+cpi)^2, ...
        yr = year_idx[t]
        inf = (1 + cpi_annual) ** (yr - 1) if yr > 1 else 1.0

        # ----- Livestock revenue (POSITIVE) -----

        # Sold breeding heifers: heads × weight × price × inflation / 1000
        # Вес — динамический из weight_model (перевод тёлок в коровы).
        sold_breeding = abs(herd["cows"]["sold_breeding"][t])
        if sold_breeding > 0:
            heifer_wt = weight["heifer_transfer_weight"][t] if weight else 0.0
            if heifer_wt <= 0:
                raise ValueError(
                    f"heifer_transfer_weight[{t}] = 0 при sold_breeding={sold_breeding}. "
                    "weight_model не отследил когорту."
                )
            val = sold_breeding * heifer_wt * prices["heifer_breeding"] * inf / 1000
            livestock_revenue[t] += val
            rev_heifers[t] = val

        # Culled cows: heads × weight × price × inflation / 1000
        # Вес — статично из weight_params (зрелые коровы).
        culled_cows = abs(herd["cows"]["culled"][t])
        if culled_cows > 0:
            val = culled_cows * cow_culled_wt * prices["cow_culled"] * inf / 1000
            livestock_revenue[t] += val
            rev_cows_culled[t] = val

        # Culled bulls: heads × weight × price × inflation / 1000
        # Вес — статично из weight_params (зрелые быки).
        culled_bulls = abs(herd["bulls"]["culled"][t])
        if culled_bulls > 0:
            val = culled_bulls * bull_culled_wt * prices["bull_culled"] * inf / 1000
            livestock_revenue[t] += val
            rev_bulls_culled[t] = val

        # Steers sold (own): heads × weight × price × inflation / 1000
        # PRIMARY revenue source. Вес — динамический из weight_model согласно
        # стратегии реализации (steer_sale_age_months).
        steers_sold = abs(herd["steers"]["sold"][t])
        if steers_sold > 0:
            steer_wt = weight["steer_sale_weight"][t] if weight else 0.0
            if steer_wt <= 0:
                raise ValueError(
                    f"steer_sale_weight[{t}] = 0 при steers_sold={steers_sold}. "
                    "weight_model не отследил когорту бычков."
                )
            val = steers_sold * steer_wt * prices["steer_own"] * inf / 1000
            livestock_revenue[t] += val
            rev_steers[t] = val

        # ----- Subsidies (POSITIVE, only when subsidy_switch != 2) -----

        if subsidy_switch != 2:
            # Purchase subsidy: 260 тыс.тг per head — month 1 ONLY (t == 0)
            if t == 0:
                purchased = (
                    abs(herd["cows"].get("purchased", [0] * n)[t])
                    + abs(herd["bulls"].get("purchased", [0] * n)[t])
                )
                if purchased > 0:
                    val = 260.0 * purchased
                    subsidies[t] += val
                    sub_purchase[t] = val

            # Bull maintenance subsidy: 100 тыс.тг × bulls_eop × inflation — every month
            bulls_eop = herd["bulls"]["eop"][t]
            if bulls_eop > 0:
                val = 100.0 * bulls_eop * inf
                subsidies[t] += val
                sub_bulls[t] = val

            # Breeding subsidy: 15 тыс.тг × inflation × sold_breeding_heifers
            if sold_breeding > 0:
                val = 15.0 * (1 + cpi_annual) ** max(0, yr - 1) * sold_breeding
                subsidies[t] += val
                sub_breeding[t] = val

    total_revenue = [
        livestock_revenue[t] + subsidies[t]
        for t in range(n)
    ]

    return {
        "livestock_revenue": livestock_revenue,
        "subsidies": subsidies,
        "total_revenue": total_revenue,
        "detail": {
            "rev_heifers": rev_heifers,
            "rev_cows_culled": rev_cows_culled,
            "rev_bulls_culled": rev_bulls_culled,
            "rev_steers": rev_steers,
            "sub_purchase": sub_purchase,
            "sub_breeding": sub_breeding,
            "sub_bulls": sub_bulls,
        },
    }
