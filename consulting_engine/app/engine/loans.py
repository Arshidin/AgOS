"""Модуль Loans — долговая нагрузка (Часть 4.9).

Investment loan:
  amount = total_capex × 0.9 (90%)
  rate = WACC rate
  grace = 2 years (no OD repayment)
  term = 10 years
  interest accrues monthly on OD balance

Working capital loan:
  rate = 6%
  term = 15 months
  Triggered by inventory formation needs
"""


def calculate_loans(
    timeline: dict,
    enriched_input: dict,
    capex: dict,
    wacc_rates: dict,
) -> dict:
    """Расчёт инвестиционного и оборотного кредитов.

    Returns:
        dict с investment_loan and working_capital_loan arrays
    """
    n = timeline["horizon_months"]
    days = timeline["days_in_month"]

    # Investment loan
    loan_share = enriched_input.get("capex_loan_share", 0.9)
    loan_amount = capex["grand_total"] * loan_share / 1000  # тыс. тг
    rate = wacc_rates["wacc"]
    grace_years = enriched_input.get("capex_grace_period_years", 2)
    grace_months = grace_years * 12
    term_years = enriched_input.get("capex_loan_term_years", 10)

    # Repayment schedule: equal annual portions after grace
    repayment_years = term_years - grace_years
    annual_repayment_pct = 1.0 / repayment_years if repayment_years > 0 else 0

    inv_balance = [0.0] * n
    inv_interest = [0.0] * n
    inv_repayment = [0.0] * n

    for t in range(n):
        if t == 0:
            inv_balance[t] = loan_amount
        else:
            inv_balance[t] = inv_balance[t - 1] - inv_repayment[t - 1]

        # Interest: balance × annual_rate × days / 365
        inv_interest[t] = inv_balance[t] * rate * days[t] / 365

        # Repayment: after grace period, annually (at month 12, 24, 36...)
        mi = timeline["month_index"][t]
        if mi > grace_months and mi % 12 == 0:
            inv_repayment[t] = loan_amount * annual_repayment_pct
        else:
            inv_repayment[t] = 0.0

    # Working capital loan (simplified — 0 for now, complex MOD logic)
    wc_balance = [0.0] * n
    wc_interest = [0.0] * n

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
        "total_interest": [
            inv_interest[t] + wc_interest[t] for t in range(n)
        ],
    }
