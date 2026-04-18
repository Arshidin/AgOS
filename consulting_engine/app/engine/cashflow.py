"""Модуль Cash Flow + NPV/IRR (Часть 4.10-4.11).

Cash Flow statement (all in тыс. тенге, monthly):
  CF Operations = net_profit + abs(depreciation)    (add back non-cash expense)
  CF Investing:  month 0 = -(capex_total/1000 + livestock_purchase_cost)
                 other months = 0
  CF Financing:  month 0 = equity + loan_amount
                 other months = -loan_repayment[t]   (principal only)
  Cash Balance = cumulative sum of all three CF lines

Investment structure:
  total_investment = capex_total/1000 + livestock_purchase_cost
  equity = total_investment × equity_share
  loan = total_investment × (1 - equity_share)

Valuation (annual basis):
  FCFF year 0 = -(equity)                           initial equity outflow
  FCFF years 1-10 = annual sum of (cf_operations + cf_investing)
  NPV = sum(fcff[yr] / (1+wacc)^yr for yr=0..10)
  IRR = numpy_financial.irr(annual_fcff)
  Payback = first year where cumulative annual FCFF >= 0
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

    Args:
        timeline: temporal axis (120 months)
        enriched_input: project parameters (equity_share, livestock_purchase_cost, etc.)
        pnl: P&L results (net_profit, depreciation_monthly)
        loans: loans results (investment_loan with amount, repayment arrays)
        capex: CAPEX results (grand_total in тенге)
        herd: herd results (unused, kept for signature)
        wacc_rates: WACC results (wacc rate as decimal)

    Returns:
        dict with cf_operations, cf_investing, cf_financing,
        cash_balance (monthly), annual_fcff, and valuation (npv, irr, payback)
    """
    n = timeline["horizon_months"]

    # --- Investment structure ---
    capex_total_thousands = capex["grand_total"] / 1000  # тыс. тг
    livestock_cost = enriched_input.get("livestock_purchase_cost", 0)  # already тыс. тг
    total_investment = capex_total_thousands + livestock_cost

    equity_share = enriched_input.get("equity_share", 0.15)
    equity = total_investment * equity_share
    loan_amount = loans["investment_loan"]["amount"]

    # Depreciation add-back (positive magnitude of the negative depreciation)
    depreciation_addback = abs(pnl["depreciation_monthly"])

    # --- Monthly cash flow arrays ---
    cf_operations = [0.0] * n
    cf_investing = [0.0] * n
    cf_financing = [0.0] * n
    cash_balance = [0.0] * n

    for t in range(n):
        # CF Operations = net_profit + depreciation add-back (non-cash)
        cf_operations[t] = pnl["net_profit"][t] + depreciation_addback

        # CF Investing: all CAPEX + livestock in month 0, zero otherwise
        if t == 0:
            cf_investing[t] = -total_investment
        else:
            cf_investing[t] = 0.0

        # CF Financing: equity + loan inflow at month 0, loan repayments thereafter
        if t == 0:
            cf_financing[t] = equity + loan_amount
        else:
            cf_financing[t] = -loans["investment_loan"]["repayment"][t]

        # Cash balance (cumulative)
        if t == 0:
            cash_balance[t] = cf_operations[t] + cf_investing[t] + cf_financing[t]
        else:
            cash_balance[t] = (
                cash_balance[t - 1]
                + cf_operations[t]
                + cf_investing[t]
                + cf_financing[t]
            )

    # --- Annual FCFF for NPV/IRR ---
    # Year 0 (index 0): initial equity outflow (negative)
    # Years 1-10 (indices 1-10): annual sum of (cf_operations + cf_investing)
    annual_fcff = [-equity]  # year 0

    for year in range(1, 11):
        start_m = (year - 1) * 12
        end_m = min(year * 12, n)
        if start_m >= n:
            annual_fcff.append(0.0)
        else:
            year_fcff = sum(
                cf_operations[t] + cf_investing[t]
                for t in range(start_m, end_m)
            )
            annual_fcff.append(year_fcff)

    # --- NPV ---
    wacc_annual = wacc_rates["wacc"]
    npv = 0.0
    for yr in range(len(annual_fcff)):
        npv += annual_fcff[yr] / (1 + wacc_annual) ** yr

    # --- IRR ---
    # None means "не вычислимо" (отрицательные потоки / нет сходимости).
    # UI отображает None как "—" вместо вводящего в заблуждение "0.0%".
    irr = None
    try:
        import numpy_financial as npf
        import math
        raw_irr = float(npf.irr(annual_fcff))
        if not (math.isnan(raw_irr) or math.isinf(raw_irr)):
            irr = raw_irr
    except Exception:
        pass

    # --- Payback period ---
    cumulative = 0.0
    payback_years = 0.0
    for i, fcff in enumerate(annual_fcff):
        cumulative += fcff
        if cumulative >= 0 and payback_years == 0:
            payback_years = float(i)
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
