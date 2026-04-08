"""Модуль Cash Flow + NPV/IRR (Часть 4.10–4.11).

Cash Flow statement:
  CF operations = net_profit + depreciation + WC changes
  CF investing = -(construction + equipment + livestock purchase)
  CF financing = loan drawdowns - loan repayments
  Cash balance = BOP + operations + investing + financing

NPV/IRR:
  Discount factor = 1 / (1 + WACC/12)^t
  NPV = sum(DFCFF_annual)
  IRR = numpy_financial.irr(annual_fcff)
"""


def calculate_cashflow(
    timeline: dict,
    enriched_input: dict,
    pnl: dict,
    loans: dict,
    capex: dict,
    herd: dict,
    wacc_rates: dict,
) -> dict:
    """Расчёт денежного потока и оценки проекта.

    Returns:
        dict с cf_operations, cf_investing, cf_financing,
              cash_balance, valuation (npv, irr, payback)
    """
    n = timeline["horizon_months"]

    equity_share = enriched_input.get("equity_share", 0.15)
    total_investment = capex["grand_total"] / 1000  # тыс. тг
    equity = total_investment * equity_share
    livestock_cost = enriched_input.get("livestock_purchase_cost", 0)

    cf_operations = [0.0] * n
    cf_investing = [0.0] * n
    cf_financing = [0.0] * n
    cash_balance = [0.0] * n

    wacc_monthly = wacc_rates["wacc"] / 12

    for t in range(n):
        # Operations: net profit + depreciation (non-cash)
        cf_operations[t] = pnl["net_profit"][t] + pnl["depreciation_monthly"]

        # Investing: CAPEX and livestock purchase (month 1 only)
        if t == 0:
            cf_investing[t] = -(total_investment + livestock_cost)
        else:
            cf_investing[t] = 0.0

        # Financing: equity (month 1) + loan drawdown - repayments
        if t == 0:
            cf_financing[t] = (
                equity
                + loans["investment_loan"]["amount"]
                - loans["investment_loan"]["repayment"][t]
            )
        else:
            cf_financing[t] = -loans["investment_loan"]["repayment"][t]

        # Cash balance
        if t == 0:
            cash_balance[t] = cf_operations[t] + cf_investing[t] + cf_financing[t]
        else:
            cash_balance[t] = (
                cash_balance[t - 1]
                + cf_operations[t]
                + cf_investing[t]
                + cf_financing[t]
            )

    # FCFF for NPV/IRR (annual)
    annual_fcff = []
    for year in range(1, 11):
        start_m = (year - 1) * 12
        end_m = min(year * 12, n)
        if start_m >= n:
            annual_fcff.append(0.0)
        else:
            year_fcff = sum(
                cf_operations[t] + cf_investing[t] for t in range(start_m, end_m)
            )
            annual_fcff.append(year_fcff)

    # NPV
    wacc_annual = wacc_rates["wacc"]
    npv = sum(
        fcff / (1 + wacc_annual) ** (i + 1)
        for i, fcff in enumerate(annual_fcff)
    )

    # IRR (try/except for convergence)
    irr = 0.0
    try:
        import numpy_financial as npf
        irr = float(npf.irr(annual_fcff))
    except Exception:
        # Fallback: simple approximation or 0
        irr = 0.0

    # Payback period (simple)
    cumulative = 0.0
    payback_years = 0.0
    for i, fcff in enumerate(annual_fcff):
        cumulative += fcff
        if cumulative >= 0 and payback_years == 0:
            payback_years = i + 1
            break

    return {
        "cf_operations": cf_operations,
        "cf_investing": cf_investing,
        "cf_financing": cf_financing,
        "cash_balance": cash_balance,
        "annual_fcff": annual_fcff,
        "valuation": {
            "npv": npv,
            "irr": irr,
            "payback_years": payback_years,
            "wacc": wacc_rates["wacc"],
        },
    }
