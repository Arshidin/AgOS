"""Модуль P&L — отчёт о прибылях и убытках (Часть 4.8.3).

Excel rows 222-240:
  222: Валовая прибыль = выручка + себестоимость
  228: EBITDA = валовая прибыль + административные расходы
  234: EBIT = EBITDA - амортизация
  238: Прибыль до налогов = EBIT + финансовые расходы
  240: Чистая прибыль = прибыль до налогов + КПН
"""


def calculate_pnl(
    timeline: dict,
    revenue: dict,
    opex: dict,
    capex: dict,
    staff: dict,
) -> dict:
    """Расчёт P&L.

    Returns:
        dict с gross_profit, ebitda, ebit, net_profit arrays
    """
    n = timeline["horizon_months"]

    gross_profit = [0.0] * n
    admin_expenses = [0.0] * n
    ebitda = [0.0] * n
    ebit = [0.0] * n
    net_profit = [0.0] * n

    depr_buildings = capex.get("depreciation_buildings_monthly", 0.0)
    depr_equipment = capex.get("depreciation_equipment_monthly", 0.0)
    total_depreciation = depr_buildings + depr_equipment

    for t in range(n):
        # Gross profit = revenue + COGS (COGS is negative)
        gross_profit[t] = revenue["total_revenue"][t] + opex["total_cogs"][t]

        # Admin expenses (simplified — land tax, office rent, repairs)
        # TODO: implement detailed admin from Excel rows 222-228
        admin_expenses[t] = 0.0

        # EBITDA
        ebitda[t] = gross_profit[t] + admin_expenses[t]

        # EBIT = EBITDA - depreciation
        ebit[t] = ebitda[t] - total_depreciation

        # Net profit (simplified — no interest or CIT yet, added in loans/cashflow)
        net_profit[t] = ebit[t]

    return {
        "gross_profit": gross_profit,
        "admin_expenses": admin_expenses,
        "ebitda": ebitda,
        "ebit": ebit,
        "depreciation_monthly": total_depreciation,
        "net_profit": net_profit,
    }
