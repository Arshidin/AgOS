"""Модуль P&L — отчёт о прибылях и убытках (Часть 4.8.3).

Income statement structure (all in тыс. тенге, monthly granularity):
  Gross Profit      = total_revenue + total_cogs          (cogs is negative)
  Admin Expenses    = land tax from opex module            (negative)
  EBITDA            = gross_profit + admin_expenses
  Depreciation      = -(buildings_monthly + equipment_monthly)  (negative)
  EBIT              = EBITDA + depreciation
  Finance Costs     = -abs(total_interest from loans)      (negative)
  Profit Before Tax = EBIT + finance_costs
  CIT (КПН 20%)    = applied annually: if cumulative 12-month profit > 0,
                      tax = -0.20 × annual_profit at months 12, 24, 36, ...
  Net Profit        = profit_before_tax + cit

Sign convention:
  Revenue, subsidies: POSITIVE
  Costs, depreciation, interest, tax: NEGATIVE
"""


def calculate_pnl(
    timeline: dict,
    revenue: dict,
    opex: dict,
    capex: dict,
    staff: dict,
    loans: dict,
) -> dict:
    """Расчёт полного P&L на 120 месяцев.

    Args:
        timeline: temporal axis (120 months)
        revenue: revenue module results (total_revenue array, positive)
        opex: opex module results (total_cogs array negative, admin_expenses array negative)
        capex: CAPEX results (depreciation_buildings_monthly, depreciation_equipment_monthly)
        staff: staff module results (unused directly — payroll already in COGS)
        loans: loans module results (total_interest array, positive magnitudes)

    Returns:
        dict with gross_profit, admin_expenses, ebitda, depreciation_monthly,
        ebit, finance_costs, profit_before_tax, cit, net_profit arrays
    """
    n = timeline["horizon_months"]

    gross_profit = [0.0] * n
    admin_expenses = [0.0] * n
    ebitda = [0.0] * n
    ebit = [0.0] * n
    finance_costs = [0.0] * n
    profit_before_tax = [0.0] * n
    cit = [0.0] * n
    net_profit = [0.0] * n

    # Monthly depreciation (constant, in тыс.тг, made negative as expense)
    depr_buildings = capex.get("depreciation_buildings_monthly", 0.0)
    depr_equipment = capex.get("depreciation_equipment_monthly", 0.0)
    depreciation_value = -(depr_buildings + depr_equipment)  # negative

    # Annual profit accumulator for CIT calculation
    annual_profit_accum = 0.0

    for t in range(n):
        # Gross profit = revenue + COGS (COGS is already negative)
        gross_profit[t] = revenue["total_revenue"][t] + opex["total_cogs"][t]

        # Admin expenses from opex module (already negative)
        admin_expenses[t] = opex["admin_expenses"][t]

        # EBITDA = gross_profit + admin_expenses
        ebitda[t] = gross_profit[t] + admin_expenses[t]

        # EBIT = EBITDA + depreciation (depreciation is negative)
        ebit[t] = ebitda[t] + depreciation_value

        # Finance costs = -abs(interest) — interest from loans is positive magnitude
        finance_costs[t] = -abs(loans["total_interest"][t])

        # Profit before tax
        profit_before_tax[t] = ebit[t] + finance_costs[t]

        # CIT (КПН 20%): applied annually at month 12, 24, 36, ...
        # Accumulate monthly profit_before_tax over the fiscal year
        annual_profit_accum += profit_before_tax[t]

        month_idx = timeline["month_index"][t]  # 1-based
        if month_idx % 12 == 0:
            # End of fiscal year — apply 20% CIT if annual profit is positive
            if annual_profit_accum > 0:
                cit[t] = -0.20 * annual_profit_accum
            else:
                cit[t] = 0.0
            # Reset accumulator for next year
            annual_profit_accum = 0.0
        else:
            cit[t] = 0.0

        # Net profit
        net_profit[t] = profit_before_tax[t] + cit[t]

    return {
        "gross_profit": gross_profit,
        "admin_expenses": admin_expenses,
        "ebitda": ebitda,
        "depreciation_monthly": depreciation_value,
        "ebit": ebit,
        "finance_costs": finance_costs,
        "profit_before_tax": profit_before_tax,
        "cit": cit,
        "net_profit": net_profit,
    }
