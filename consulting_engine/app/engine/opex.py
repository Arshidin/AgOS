"""Модуль OPEX — себестоимость репродуктора (Часть 4.7).

Excel rows 204-214:
  205: Корма (from CFC total_reproducer)
  206: Вет препараты (6500 × avg_livestock × inflation / 1000 / 12)
  207: RFID-чипы (500 × avg_livestock × inflation / 1000 / 12)
  208: Ушные бирки (500 × total_eop × inflation / 1000 / 12)
  209: Страхование маточного (cow_price × 600 × cows_eop / 1000 × 0.015 × 0.2 / 12)
  210: ФОТ штат (from Staff)
  211: ФОТ пастухи (500 тыс.тг × inflation)
  212: Платежи в бюджет (пастухи × 0.35)
  213: Текущие расходы (200 тыс.тг × inflation)
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
    """Расчёт себестоимости репродуктора.

    Returns:
        dict с cogs_reproducer, cogs_fattening, total_cogs arrays
    """
    n = timeline["horizon_months"]
    year_idx = timeline["year_index"]

    cogs_reproducer = [0.0] * n
    cogs_fattening = [0.0] * n

    cow_price_per_kg = enriched_input.get("purchase_price_cow", 550_000) / 600  # тг/кг

    for t in range(n):
        inf = (1 + CPI_ANNUAL) ** (year_idx[t] - 1) if year_idx[t] > 1 else 1.0
        avg_livestock = herd["total_avg_livestock"][t]
        total_eop = sum(
            herd[g]["eop"][t]
            for g in ["cows", "bulls", "calves", "heifers", "steers"]
        )
        cows_eop = herd["cows"]["eop"][t]

        # 205: Корма
        feed_cost = feeding["total_reproducer"][t]

        # 206: Вет препараты (6500 тг/гол/год)
        vet_cost = -(6500 * avg_livestock * inf) / 1000 / 12

        # 207: RFID-чипы (500 тг/гол/год)
        rfid_cost = -(500 * avg_livestock * inf) / 1000 / 12

        # 208: Ушные бирки (500 тг/гол/год based on EOP)
        tags_cost = -(500 * total_eop * inf) / 1000 / 12

        # 209: Страхование маточного
        insurance = -(cow_price_per_kg * inf * 600 * cows_eop) / 1000 * 0.015 * 0.2 / 12

        # 210: ФОТ штат
        payroll = -abs(staff["monthly_payroll"][t])

        # 211: ФОТ пастухи (500 тыс.тг base)
        herders = -(500 * inf)

        # 212: Платежи в бюджет (35% от пастухов)
        budget_payments = herders * 0.35

        # 213: Текущие расходы (200 тыс.тг base)
        current_expenses = -(200 * inf)

        # 214: Прочие расходы (0.1% от выручки скота)
        other = -0.001 * max(0, revenue["livestock_revenue"][t])

        cogs_reproducer[t] = (
            feed_cost + vet_cost + rfid_cost + tags_cost + insurance
            + payroll + herders + budget_payments + current_expenses + other
        )

    total_cogs = [
        cogs_reproducer[t] + cogs_fattening[t]
        for t in range(n)
    ]

    return {
        "cogs_reproducer": cogs_reproducer,
        "cogs_fattening": cogs_fattening,
        "total_cogs": total_cogs,
    }
