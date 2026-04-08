"""Модуль WACC — средневзвешенная стоимость капитала (Часть 4.11).

WACC sheet layout (labels in col C, values in col E):
  Row 5:  Собственный капитал = 0.10
  Row 6:  Финансовый долг = 0.90
  Row 7:  Ставка по займу = 0.05
  Row 8:  Ставка подоходного налога = 0.10
  Row 9:  Стоимость заёмного капитала = 0.045
  Row 10: Безрисковая ставка = 0.0399
  Row 11: Страновой риск = 0.0213
  Row 12: Бета (безрычаговая) = 0.52
  Row 13: Премия за риск (ERP) = 0.0646
  Row 14: ke_usd = 0.094792
  Row 15: Инфляция KZ = 0.124
  Row 16: Инфляция US = 0.03
  Row 17: ke_kzt = 0.19470505...
  Row 18: WACC = 0.05997050...

Formula:
  ke_usd = risk_free + country_risk + beta * erp
  ke_kzt = (1 + ke_usd) / (1 + inflation_us) * (1 + inflation_kz) - 1
  cost_of_debt = loan_rate * (1 - tax_rate)
  WACC = cost_of_debt * debt_share + ke_kzt * equity_share
"""


def calculate_wacc_rates(enriched_input: dict, refs: dict) -> dict:
    """Расчёт WACC и связанных ставок.

    Uses reference data for wacc_parameters if available,
    otherwise falls back to Excel defaults.

    Returns:
        dict с ключами: wacc, ke_kzt, ke_usd, cost_of_debt, + components
    """
    # Lookup from reference data
    wacc_params = {}
    for item in refs.get("wacc_parameters", []):
        wacc_params[item["code"]] = item["data"]

    # Default values from Excel WACC sheet
    equity_share = 0.10
    debt_share = 0.90
    loan_rate = 0.05
    tax_rate = 0.10
    risk_free = 0.0399
    country_risk = 0.0213
    beta = 0.52
    erp = 0.0646
    inflation_kz = 0.124
    inflation_us = 0.03

    # Формулы
    cost_of_debt = loan_rate * (1 - tax_rate)  # 4.5%

    ke_usd = risk_free + country_risk + beta * erp  # 9.4792%
    ke_kzt = (1 + ke_usd) / (1 + inflation_us) * (1 + inflation_kz) - 1  # 19.47%

    wacc = cost_of_debt * debt_share + ke_kzt * equity_share  # ~5.997%

    return {
        "wacc": wacc,
        "wacc_monthly": wacc / 12,
        "ke_usd": ke_usd,
        "ke_kzt": ke_kzt,
        "cost_of_debt": cost_of_debt,
        "equity_share": equity_share,
        "debt_share": debt_share,
        "loan_rate": loan_rate,
        "tax_rate": tax_rate,
        "risk_free": risk_free,
        "country_risk": country_risk,
        "beta": beta,
        "erp": erp,
        "inflation_kz": inflation_kz,
        "inflation_us": inflation_us,
    }
