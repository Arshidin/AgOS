"""Модуль выручки + субсидий (Часть 4.8.1-4.8.2).

Revenue sources (all in тыс. тенге):
  Row 189: Тёлки племенные — sold_breeding × 267кг × 2200 тг/кг × inflation / 1000
  Row 190: Маточное выбракованное — abs(culled_cows) × 600кг × 1800 тг/кг × inflation / 1000
  Row 191: Быки выбракованные — abs(culled_bulls) × 750кг × 2200 тг/кг × inflation / 1000

Subsidies (subsidy_switch != 2):
  Row 194: Закуп поголовья — 260 тыс.тг × (purchased_cows + purchased_bulls), month 1 only
  Row 195: Выращивание племенного молодняка — 15 тыс.тг × inflation × sold_breeding_heifers
  Row 196: Содержание быков — 100 тыс.тг × bulls_eop × inflation, every month

Inflation: 10.5% annual, applied from year 2 onward.
"""

CPI_ANNUAL = 0.105  # Annual livestock price inflation

# Base prices (тг/кг живого веса) — from Excel row 181-186
BASE_PRICES = {
    "heifer_breeding": 2200,
    "cow_culled": 1800,
    "bull_culled": 2200,
    "steer_own": 2200,       # own steers sold after growth
}

# Weight constants (кг) — from Excel CFC rows 103-108
COW_CULLED_WEIGHT = 600      # mature cow weight at culling
BULL_CULLED_WEIGHT = 750     # mature bull weight at culling
HEIFER_WEIGHT = 267          # ~170 + 4mo × 30d × 810г/d ≈ 267 кг
STEER_WEIGHT = 331           # from Excel E152: avg live weight after growth


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
        weight: dynamic weight model results (steer_sale_weight, heifer_transfer_weight, etc.)
                If None, falls back to hardcoded weight constants.

    Returns:
        dict with livestock_revenue, subsidies, total_revenue arrays
    """
    n = timeline["horizon_months"]
    year_idx = timeline["year_index"]
    subsidy_switch = enriched_input.get("subsidy_switch", 1)

    livestock_revenue = [0.0] * n
    subsidies = [0.0] * n

    for t in range(n):
        # Inflation factor: year 1 = 1.0, year 2 = 1.105, year 3 = 1.105^2, ...
        yr = year_idx[t]
        inf = (1 + CPI_ANNUAL) ** (yr - 1) if yr > 1 else 1.0

        # ----- Livestock revenue (POSITIVE) -----
        # Dynamic weights from weight_model or fallback to hardcoded constants
        cow_wt = weight["cow_culled_weight"] if weight else COW_CULLED_WEIGHT
        bull_wt = weight["bull_culled_weight"] if weight else BULL_CULLED_WEIGHT
        heifer_wt = (
            weight["heifer_transfer_weight"][t]
            if weight and weight["heifer_transfer_weight"][t] > 0
            else HEIFER_WEIGHT
        )
        steer_wt = (
            weight["steer_sale_weight"][t]
            if weight and weight["steer_sale_weight"][t] > 0
            else STEER_WEIGHT
        )

        # Sold breeding heifers: heads × weight × price × inflation / 1000
        sold_breeding = abs(herd["cows"]["sold_breeding"][t])
        if sold_breeding > 0:
            livestock_revenue[t] += (
                sold_breeding * heifer_wt * BASE_PRICES["heifer_breeding"] * inf / 1000
            )

        # Culled cows: heads × weight × price × inflation / 1000
        culled_cows = abs(herd["cows"]["culled"][t])
        if culled_cows > 0:
            livestock_revenue[t] += (
                culled_cows * cow_wt * BASE_PRICES["cow_culled"] * inf / 1000
            )

        # Culled bulls: heads × weight × price × inflation / 1000
        culled_bulls = abs(herd["bulls"]["culled"][t])
        if culled_bulls > 0:
            livestock_revenue[t] += (
                culled_bulls * bull_wt * BASE_PRICES["bull_culled"] * inf / 1000
            )

        # Steers sold (own): heads × weight × price × inflation / 1000
        # PRIMARY revenue source — steers sold after growth period
        steers_sold = abs(herd["steers"]["sold"][t])
        if steers_sold > 0:
            livestock_revenue[t] += (
                steers_sold * steer_wt * BASE_PRICES["steer_own"] * inf / 1000
            )

        # ----- Subsidies (POSITIVE, only when subsidy_switch != 2) -----

        if subsidy_switch != 2:
            # Purchase subsidy: 260 тыс.тг per head — month 1 ONLY (t == 0)
            if t == 0:
                purchased = (
                    abs(herd["cows"].get("purchased", [0] * n)[t])
                    + abs(herd["bulls"].get("purchased", [0] * n)[t])
                )
                if purchased > 0:
                    subsidies[t] += 260.0 * purchased

            # Bull maintenance subsidy: 100 тыс.тг × bulls_eop × inflation — every month
            bulls_eop = herd["bulls"]["eop"][t]
            if bulls_eop > 0:
                subsidies[t] += 100.0 * bulls_eop * inf

            # Breeding subsidy: 15 тыс.тг × inflation × sold_breeding_heifers
            if sold_breeding > 0:
                subsidies[t] += 15.0 * (1 + CPI_ANNUAL) ** max(0, yr - 1) * sold_breeding

    total_revenue = [
        livestock_revenue[t] + subsidies[t]
        for t in range(n)
    ]

    return {
        "livestock_revenue": livestock_revenue,
        "subsidies": subsidies,
        "total_revenue": total_revenue,
    }
