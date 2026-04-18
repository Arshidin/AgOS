"""Модуль STAFF — ФОТ + налоги РК (Часть 4.6 спецификации).

Positions are now configurable via enriched_input["staff_positions"].
Default 5 positions are provided by ProjectInput schema for backward compat.

Tax rates (Kazakhstan):
  SO  = 3.5%  (social contributions, capped at 7×min_wage)
  SN  = 9.5%  (social tax)
  OSMS_employer = 3%  (capped at 10×min_wage)
  OSMS_employee = 2%
  OPV = 10%   (pension)
  Net-to-gross multiplier = 1.21

Output split:
  monthly_payroll_production → goes into COGS (opex.cogs_reproducer)
  monthly_payroll_admin → goes into admin_expenses (opex.admin_expenses)
  monthly_payroll → total (backward compat)
"""


def calculate_staff(timeline: dict, enriched_input: dict, refs: dict) -> dict:
    """Расчёт фонда оплаты труда для N позиций.

    Returns:
        dict с positions, monthly breakdown, production/admin split, and detail.
    """
    n = timeline["horizon_months"]

    # Tax parameters
    so_rate = 0.035
    sn_rate = 0.095
    osms_employer_rate = 0.03
    osms_employee_rate = 0.02
    opv_rate = 0.10
    net_to_gross = 1.21
    min_wage = 93.0   # тыс. тенге (93000 тг)
    max_so_base = 7 * min_wage
    max_osms_base = 10 * min_wage

    # Inflation — use shared cpi_annual parameter (consulting_reference_data)
    annual_cpi = enriched_input.get("cpi_annual", 0.105)

    # Positions from project input (configurable)
    positions_raw = enriched_input.get("staff_positions", [])
    if not positions_raw:
        # Fallback to hardcoded defaults (should not happen with schema defaults)
        positions_raw = [
            {"code": "director", "name": "Директор фермы", "category": "production", "fte": 1.0, "net_salary": 600.0},
            {"code": "vet", "name": "Ветеринар", "category": "production", "fte": 0.5, "net_salary": 400.0},
            {"code": "cook", "name": "Повар", "category": "production", "fte": 0.5, "net_salary": 300.0},
            {"code": "tractor", "name": "Тракторист", "category": "production", "fte": 1.0, "net_salary": 400.0},
            {"code": "herder", "name": "Пастух", "category": "production", "fte": 1.0, "net_salary": 250.0},
            {"code": "herder", "name": "Пастух", "category": "production", "fte": 1.0, "net_salary": 250.0},
            {"code": "accountant", "name": "Бухгалтер", "category": "admin", "fte": 0.3, "net_salary": 300.0},
        ]

    # Normalize: ensure dicts (may be Pydantic models or dicts)
    positions = []
    for p in positions_raw:
        if isinstance(p, dict):
            positions.append(p)
        else:
            positions.append(p.model_dump() if hasattr(p, "model_dump") else dict(p))

    # Output arrays
    monthly_payroll = [0.0] * n
    monthly_payroll_production = [0.0] * n
    monthly_payroll_admin = [0.0] * n
    monthly_personnel = [0.0] * n
    monthly_so = [0.0] * n
    monthly_sn = [0.0] * n
    monthly_osms = [0.0] * n

    # Per-position detail: {position_code: [monthly_total_cost]}
    detail_by_position = {p.get("code", f"pos_{i}"): [0.0] * n for i, p in enumerate(positions)}

    for t in range(n):
        year_idx = timeline["year_index"][t]
        inflation_factor = (1 + annual_cpi) ** (year_idx - 1) if year_idx > 1 else 1.0

        total_personnel = 0.0
        total_so = 0.0
        total_sn = 0.0
        total_osms = 0.0
        total_production = 0.0
        total_admin = 0.0

        for i, pos in enumerate(positions):
            fte = pos.get("fte", 1.0)
            net_sal = pos.get("net_salary", 0.0)
            category = pos.get("category", "production")
            code = pos.get("code", f"pos_{i}")

            # Net salary × FTE × inflation
            net = net_sal * fte * inflation_factor

            # Gross salary (нетто → брутто)
            gross = net * net_to_gross

            # SO: 3.5% of gross, capped at 7×min_wage
            so_base = min(gross, max_so_base * inflation_factor)
            so = so_rate * so_base

            # SN: 9.5% of (gross - OPV - OSMS_employee) - SO
            opv = opv_rate * gross
            osms_emp = osms_employee_rate * min(gross, max_osms_base * inflation_factor)
            sn = max(0, sn_rate * (gross - opv - osms_emp) - so)

            # OSMS employer: 3% of gross, capped at 10×min_wage
            osms_base = min(gross, max_osms_base * inflation_factor)
            osms = osms_employer_rate * osms_base

            position_total = gross + so + sn + osms

            total_personnel += gross
            total_so += so
            total_sn += sn
            total_osms += osms

            if category == "admin":
                total_admin += position_total
            else:
                total_production += position_total

            if code in detail_by_position:
                detail_by_position[code][t] = position_total

        monthly_personnel[t] = total_personnel
        monthly_so[t] = total_so
        monthly_sn[t] = total_sn
        monthly_osms[t] = total_osms
        monthly_payroll[t] = total_personnel + total_so + total_sn + total_osms
        monthly_payroll_production[t] = total_production
        monthly_payroll_admin[t] = total_admin

    # Position summary (for UI display)
    pos_summary = []
    for pos in positions:
        fte = pos.get("fte", 1.0)
        net_sal = pos.get("net_salary", 0.0)
        effective_net = net_sal * fte
        effective_gross = effective_net * net_to_gross
        pos_summary.append({
            "code": pos.get("code", ""),
            "name": pos.get("name", ""),
            "category": pos.get("category", "production"),
            "fte": fte,
            "net_salary": net_sal,
            "effective_net": effective_net,
            "effective_gross": effective_gross,
        })

    return {
        "positions": pos_summary,
        "total_fte": sum(p.get("fte", 0) for p in positions),
        "monthly_payroll": monthly_payroll,
        "monthly_payroll_production": monthly_payroll_production,
        "monthly_payroll_admin": monthly_payroll_admin,
        "monthly_personnel": monthly_personnel,
        "monthly_so": monthly_so,
        "monthly_sn": monthly_sn,
        "monthly_osms": monthly_osms,
        "detail": detail_by_position,
    }
