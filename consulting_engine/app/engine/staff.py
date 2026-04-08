"""Модуль STAFF — ФОТ + налоги РК (Часть 4.6 спецификации).

Staff sheet layout:
  Row 36: Total monthly payroll (тыс. тенге)
  Row 37: Personnel (gross salaries)
  Row 38: SO (социальные отчисления, 3.5%)
  Row 39: SN (социальный налог, 9.5%)
  Row 40: OSMS (обязательное мед. страхование, 3%)

Positions (5 штук, net salary in тыс. тг/мес):
  1. Директор фермы   — FTE 1.0,  net 600
  2. Ветеринар         — FTE 0.5,  net 400
  3. Повар             — FTE 0.5,  net 300
  4. Тракторист        — FTE 1.0,  net 400
  5. Бухгалтер         — FTE 0.3,  net 300

Tax rates (Kazakhstan):
  SO  = 3.5%  (social contributions, capped at 7×min_wage)
  SN  = 9.5%  (social tax)
  OSMS_employer = 3%  (capped at 10×min_wage)
  OSMS_employee = 2%
  OPV = 10%   (pension)
  Net-to-gross multiplier = 1.21
"""


def calculate_staff(timeline: dict, enriched_input: dict, refs: dict) -> dict:
    """Расчёт фонда оплаты труда для 5 позиций.

    Returns:
        dict с positions, monthly breakdown, and total arrays.
    """
    n = timeline["horizon_months"]

    # Tax parameters
    so_rate = 0.035
    sn_rate = 0.095
    osms_employer_rate = 0.03
    osms_employee_rate = 0.02
    opv_rate = 0.10
    net_to_gross = 1.21
    mrp_base = 3.932  # тыс. тенге (3932 тг)
    min_wage = 93.0   # тыс. тенге (93000 тг)
    max_so_base = 7 * min_wage
    max_osms_base = 10 * min_wage

    # Inflation from timeline (annual CPI)
    # For now using 11% from Excel (Staff!F6)
    annual_cpi = 0.11

    # 5 positions
    positions = [
        {"name": "Директор фермы", "fte": 1.0, "net_salary": 600.0},
        {"name": "Ветеринар", "fte": 0.5, "net_salary": 400.0},
        {"name": "Повар", "fte": 0.5, "net_salary": 300.0},
        {"name": "Тракторист", "fte": 1.0, "net_salary": 400.0},
        {"name": "Бухгалтер", "fte": 0.3, "net_salary": 300.0},
    ]

    # Calculate per-position monthly cost
    monthly_payroll = [0.0] * n
    monthly_personnel = [0.0] * n
    monthly_so = [0.0] * n
    monthly_sn = [0.0] * n
    monthly_osms = [0.0] * n

    for t in range(n):
        year_idx = timeline["year_index"][t]
        # Inflation factor (applied from year 2)
        inflation_factor = (1 + annual_cpi) ** (year_idx - 1) if year_idx > 1 else 1.0

        total_personnel = 0.0
        total_so = 0.0
        total_sn = 0.0
        total_osms = 0.0

        for pos in positions:
            # Net salary × FTE × inflation
            net = pos["net_salary"] * pos["fte"] * inflation_factor

            # Gross salary (нетто → брутто)
            gross = net * net_to_gross

            # SO: 3.5% of gross, capped at 7×min_wage
            so_base = min(gross, max_so_base * inflation_factor)
            so = so_rate * so_base

            # SN: 9.5% of (gross - OPV - OSMS_employee) - SO
            # Per Kazakhstan Tax Code
            opv = opv_rate * gross
            osms_emp = osms_employee_rate * min(gross, max_osms_base * inflation_factor)
            sn = max(0, sn_rate * (gross - opv - osms_emp) - so)

            # OSMS employer: 3% of gross, capped at 10×min_wage
            osms_base = min(gross, max_osms_base * inflation_factor)
            osms = osms_employer_rate * osms_base

            total_personnel += gross
            total_so += so
            total_sn += sn
            total_osms += osms

        monthly_personnel[t] = total_personnel
        monthly_so[t] = total_so
        monthly_sn[t] = total_sn
        monthly_osms[t] = total_osms
        monthly_payroll[t] = total_personnel + total_so + total_sn + total_osms

    # Position summary (for UI display)
    pos_summary = []
    for pos in positions:
        effective_net = pos["net_salary"] * pos["fte"]
        effective_gross = effective_net * net_to_gross
        pos_summary.append({
            "name": pos["name"],
            "fte": pos["fte"],
            "net_salary": pos["net_salary"],
            "effective_net": effective_net,
            "effective_gross": effective_gross,
        })

    return {
        "positions": pos_summary,
        "total_fte": sum(p["fte"] for p in positions),
        "monthly_payroll": monthly_payroll,
        "monthly_personnel": monthly_personnel,
        "monthly_so": monthly_so,
        "monthly_sn": monthly_sn,
        "monthly_osms": monthly_osms,
    }
