"""Модуль выручки + субсидий (Часть 4.8.1–4.8.2).

Revenue sources:
  Row 189: Тёлки племенные (sold_breeding × weight × price)
  Row 190: Маточное выбракованное (culled × 600 кг × price)
  Row 191: Быки выбракованные (culled × 750 кг × price)
  Row 192: Собственные бычки (sold steers × weight × price)
  Row 194: Субсидии закуп поголовья (260,000 × purchased heads / 1000)
  Row 195: Субсидии при выращивании племенного молодняка
  Row 196: Субсидии содержание быков (100,000 × bulls_eop / 1000)
"""

CPI_ANNUAL = 0.105  # Feed/livestock price inflation

# Base prices (тг/кг живого веса)
BASE_PRICES = {
    "heifer_breeding": 2200,
    "cow_culled": 1800,
    "bull_culled": 2200,
    "steer_own": 2200,
    "steer_purchased_sell": 2200,
    "steer_purchased_buy": 1800,
}

# Weight constants (кг)
COW_CULLED_WEIGHT = 600
BULL_CULLED_WEIGHT = 750
HEIFER_WEIGHT_BASE = 267.2  # Start 170 + 4m × 30d × 810g/d / 1000


def calculate_revenue(
    timeline: dict, enriched_input: dict, herd: dict, refs: dict
) -> dict:
    """Расчёт выручки от продажи КРС + субсидии.

    Returns:
        dict с livestock_revenue, subsidies, total_revenue arrays
    """
    n = timeline["horizon_months"]
    year_idx = timeline["year_index"]
    subsidy_switch = enriched_input.get("subsidy_switch", 1)

    livestock_revenue = [0.0] * n
    subsidies = [0.0] * n

    for t in range(n):
        inf = (1 + CPI_ANNUAL) ** (year_idx[t] - 1) if year_idx[t] > 1 else 1.0

        # Livestock revenue = sold heads × weight × price / 1000
        # Sold breeding heifers
        sold_breeding = abs(herd["cows"]["sold_breeding"][t])
        if sold_breeding > 0:
            livestock_revenue[t] += (
                BASE_PRICES["heifer_breeding"] * inf * HEIFER_WEIGHT_BASE * sold_breeding / 1000
            )

        # Culled cows
        sold_cows = abs(herd["cows"]["culled"][t])
        if sold_cows > 0:
            livestock_revenue[t] += (
                BASE_PRICES["cow_culled"] * inf * COW_CULLED_WEIGHT * sold_cows / 1000
            )

        # Culled bulls
        sold_bulls = abs(herd["bulls"]["culled"][t])
        if sold_bulls > 0:
            livestock_revenue[t] += (
                BASE_PRICES["bull_culled"] * inf * BULL_CULLED_WEIGHT * sold_bulls / 1000
            )

        # Sold steers
        sold_steers = abs(herd["steers"]["sold"][t])
        if sold_steers > 0:
            livestock_revenue[t] += (
                BASE_PRICES["steer_own"] * inf * HEIFER_WEIGHT_BASE * sold_steers / 1000
            )

        # Subsidies (if switch = 1)
        if subsidy_switch == 1:
            # Purchase subsidy: 260,000 × (purchased cows + purchased bulls) / 1000
            purchased = (
                abs(herd["cows"]["purchased"][t])
                + abs(herd["bulls"]["purchased"][t])
            )
            if purchased > 0:
                subsidies[t] += 260 * purchased  # 260,000 / 1000 = 260 тыс.тг per head

            # Bull maintenance subsidy: 100,000 × bulls_eop / 1000
            bulls_eop = herd["bulls"]["eop"][t]
            if bulls_eop > 0:
                subsidies[t] += 100 * bulls_eop * inf

            # Breeding subsidy: for heifers/steers (active after calving)
            # TODO: implement from Excel row 195

    total_revenue = [
        livestock_revenue[t] + subsidies[t]
        for t in range(n)
    ]

    return {
        "livestock_revenue": livestock_revenue,
        "subsidies": subsidies,
        "total_revenue": total_revenue,
    }
