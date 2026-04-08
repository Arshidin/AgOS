"""Модуль OPEX — себестоимость репродуктора + административные расходы (Часть 4.7).

COGS (себестоимость) — Excel rows 204-214 — all values NEGATIVE (costs):
  205: Корма (from feeding total_reproducer, already negative)
  206: Вет препараты — 6500 тг/гол/год × avg_livestock × inflation / 1000 / 12
  207: RFID-чипы — 500 тг/гол/год × avg_livestock × inflation / 1000 / 12
  208: Ушные бирки — 500 тг/гол/год × total_eop × inflation / 1000 / 12
  209: Страхование — cow_price/600 × inflation × 600 × cows_eop / 1000 × 0.015 × 0.2 / 12
  210: ФОТ штат (from Staff monthly_payroll, made negative)
  211: ФОТ пастухи — 500 тыс.тг × inflation
  212: Платежи в бюджет — пастухи × 0.35
  213: Текущие расходы — 200 тыс.тг × inflation
  214: Прочие расходы — 0.1% от livestock_revenue

Admin expenses (административные расходы):
  Land tax — 12.05 тг/га × pasture_area / 1000 / 12 per month (NEGATIVE)

All monetary values in тыс. тенге (thousands).
"""

CPI_ANNUAL = 0.105


def calculate_opex(
    timeline: dict,
    enriched_input: dict,
    herd: dict,
    feeding: dict,
    staff: dict,
    revenue: dict,
    refs: dict,
) -> dict:
    """Расчёт себестоимости репродуктора и административных расходов.

    All cost arrays are NEGATIVE (expenses reduce profit).

    Args:
        timeline: temporal axis (120 months)
        enriched_input: project parameters (pasture_area, purchase_price_cow, etc.)
        herd: herd turnover results
        feeding: feeding model results (total_reproducer array, already negative)
        staff: staff model results (monthly_payroll array)
        revenue: revenue results (livestock_revenue for 0.1% calc)
        refs: reference data (unused, kept for signature)

    Returns:
        dict with cogs_reproducer, cogs_fattening, total_cogs,
        admin_expenses arrays (all 120-element monthly, negative)
    """
    n = timeline["horizon_months"]
    year_idx = timeline["year_index"]

    cogs_reproducer = [0.0] * n
    cogs_fattening = [0.0] * n
    admin_expenses = [0.0] * n

    # Derive cow price per kg from purchase price (тг)
    purchase_price_cow = enriched_input.get("purchase_price_cow", 550_000)
    cow_price_per_kg = purchase_price_cow / 600  # тг/кг

    # Pasture area for land tax
    pasture_area = enriched_input.get("pasture_area", 0)

    for t in range(n):
        yr = year_idx[t]
        inf = (1 + CPI_ANNUAL) ** (yr - 1) if yr > 1 else 1.0

        avg_livestock = herd["total_avg_livestock"][t]
        total_eop = sum(
            herd[g]["eop"][t]
            for g in ["cows", "bulls", "calves", "heifers", "steers"]
        )
        cows_eop = herd["cows"]["eop"][t]

        # --- 10 COGS lines (all negative) ---

        # 205: Корма (already negative from feeding module)
        feed_cost = feeding["total_reproducer"][t]

        # 206: Вет препараты (6500 тг/гол/год)
        vet_cost = -(6500 * avg_livestock * inf) / 1000 / 12

        # 207: RFID-чипы (500 тг/гол/год on avg livestock)
        rfid_cost = -(500 * avg_livestock * inf) / 1000 / 12

        # 208: Ушные бирки (500 тг/гол/год on total EOP)
        tags_cost = -(500 * total_eop * inf) / 1000 / 12

        # 209: Страхование маточного поголовья
        # Formula: cow_price_per_kg × inf × 600кг × cows_eop / 1000 × 1.5% × 20% / 12
        insurance = -(cow_price_per_kg * inf * 600 * cows_eop) / 1000 * 0.015 * 0.2 / 12

        # 210: ФОТ штат (from staff module, ensure negative)
        payroll = -abs(staff["monthly_payroll"][t])

        # 211: ФОТ пастухи (500 тыс.тг base × inflation)
        herders = -(500 * inf)

        # 212: Платежи в бюджет (35% от пастухов — social tax on herder wages)
        budget_payments = herders * 0.35

        # 213: Текущие расходы (200 тыс.тг base × inflation)
        current_expenses = -(200 * inf)

        # 214: Прочие расходы (0.1% от выручки скота — positive revenue × -0.001)
        other = -0.001 * max(0, revenue["livestock_revenue"][t])

        cogs_reproducer[t] = (
            feed_cost + vet_cost + rfid_cost + tags_cost + insurance
            + payroll + herders + budget_payments + current_expenses + other
        )

        # --- Admin expenses (NEGATIVE) ---
        # Land tax: 12.05 тг/га × pasture_area / 1000 (тыс.тг/год) / 12 (monthly)
        land_tax = -(12.05 * pasture_area) / 1000 / 12
        admin_expenses[t] = land_tax

    total_cogs = [
        cogs_reproducer[t] + cogs_fattening[t]
        for t in range(n)
    ]

    return {
        "cogs_reproducer": cogs_reproducer,
        "cogs_fattening": cogs_fattening,
        "total_cogs": total_cogs,
        "admin_expenses": admin_expenses,
    }
