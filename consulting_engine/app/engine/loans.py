"""Модуль Loans — долговая нагрузка (Часть 4.9).

Investment loan:
  amount = capex["grand_total"] / 1000 × capex_loan_share (default 0.9)
  rate = WACC rate (e.g. 0.05997)
  grace = 2 years (24 months) — no principal repayment, interest accrues
  principal repayment: starting month 25, annual lump payments of (amount / 8)
      at every 12th month boundary (months 36, 48, 60, 72, 84, 96, 108, 120)
  od_eop reaches ~0 by month 120

Interest formula: balance × annual_rate × days_in_month / 365

All monetary values in тыс. тенге (thousands).
Interest values are POSITIVE in the arrays (sign is applied in P&L as finance_costs).
"""


def calculate_loans(
    timeline: dict,
    enriched_input: dict,
    capex: dict,
    wacc_rates: dict,
) -> dict:
    """Расчёт инвестиционного кредита.

    Args:
        timeline: temporal axis (120 months, with days_in_month)
        enriched_input: project parameters (capex_loan_share, grace period, etc.)
        capex: CAPEX results (grand_total in тенге)
        wacc_rates: WACC results (wacc rate as decimal, e.g. 0.05997)

    Returns:
        dict with investment_loan (amount, balance, interest, repayment arrays),
        working_capital_loan (stub), and total_interest array.
        Interest and repayment values are POSITIVE magnitudes.
    """
    n = timeline["horizon_months"]
    days = timeline["days_in_month"]
    mi = timeline["month_index"]  # 1-based: 1..120

    # --- Investment loan parameters ---
    loan_share = enriched_input.get("capex_loan_share", 0.9)
    loan_amount = capex["grand_total"] / 1000 * loan_share  # тыс. тг

    rate = wacc_rates["wacc"]  # annual rate, e.g. 0.05997

    grace_months = enriched_input.get("capex_grace_period_years", 2) * 12  # 24
    term_years = enriched_input.get("capex_loan_term_years", 10)

    # Repayment: 8 equal annual payments after 2-year grace
    # Years 3-10 = 8 years of repayment
    repayment_years = term_years - (grace_months // 12)  # 10 - 2 = 8
    annual_principal = loan_amount / repayment_years if repayment_years > 0 else 0

    # Arrays
    inv_balance = [0.0] * n   # OD EOP (outstanding debt end of period)
    inv_interest = [0.0] * n  # monthly interest accrued (positive)
    inv_repayment = [0.0] * n  # principal repayment (positive)

    for t in range(n):
        # Beginning of period balance
        if t == 0:
            bop = loan_amount
        else:
            bop = inv_balance[t - 1]

        # Interest: bop × annual_rate × days_in_month / 365
        inv_interest[t] = bop * rate * days[t] / 365

        # Principal repayment: after grace period, at every 12-month boundary
        # Grace = months 1-24 (mi 1..24). Repayment starts from mi=25.
        # Annual lump at mi = 36, 48, 60, 72, 84, 96, 108, 120
        # (i.e., every 12th month starting from month 36 = end of year 3)
        month_idx = mi[t]  # 1-based
        if month_idx > grace_months and month_idx % 12 == 0:
            inv_repayment[t] = min(annual_principal, bop)
        else:
            inv_repayment[t] = 0.0

        # End of period balance
        inv_balance[t] = bop - inv_repayment[t]

    # Working capital loan (stub — zero for now)
    wc_balance = [0.0] * n
    wc_interest = [0.0] * n

    # Total interest (positive magnitudes — sign applied in P&L)
    total_interest = [
        inv_interest[t] + wc_interest[t] for t in range(n)
    ]

    return {
        "investment_loan": {
            "amount": loan_amount,
            "balance": inv_balance,
            "interest": inv_interest,
            "repayment": inv_repayment,
        },
        "working_capital_loan": {
            "balance": wc_balance,
            "interest": wc_interest,
        },
        "total_interest": total_interest,
    }
