"""Модуль OPEX — себестоимость репродуктора + административные расходы (Часть 4.7).

COGS (себестоимость) — Excel rows 204-214 — all values NEGATIVE (costs):
  205: Корма (from feeding total_reproducer, already negative)
  206: Вет препараты — 6500 тг/гол/год × avg_livestock × inflation / 1000 / 12
  207: RFID-чипы — 500 тг/гол/год × avg_livestock × inflation / 1000 / 12
  208: Ушные бирки — 500 тг/гол/год × total_eop × inflation / 1000 / 12
  209: Страхование — cow_price/600 × inflation × 600 × cows_eop / 1000 × 0.015 × 0.2 / 12
  210: ФОТ штат (from Staff monthly_payroll, made negative)
  211: ФОТ пастухи — 500 тыс.тг × inflation
  212: Платежи в бюджет — пастухи × 0.35
  213: Текущие расходы — 200 тыс.тг × inflation
  214: Прочие расходы — 0.1% от livestock_revenue

Admin expenses (административные расходы):
  Land tax — 12.05 тг/га × pasture_area / 1000 / 12 per month (NEGATIVE)

All monetary values in тыс. тенге (thousands).
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
    """Расчёт себестоимости репродуктора и административных расходов.

    All cost arrays are NEGATIVE (expenses reduce profit).

    Args:
        timeline: temporal axis (120 months)
        enriched_input: project parameters (pasture_area, purchase_price_cow, etc.)
        herd: herd turnover results
        feeding: feeding model results (total_reproducer array, already negative)
        staff: staff model results (monthly_payroll array)
        revenue: revenue results (livestock_revenue for 0.1% calc)
        refs: reference data (unused, kept for signature)

    Returns:
        dict with cogs_reproducer, cogs_fattening, total_cogs,
        admin_expenses arrays (all 120-element monthly, negative)
    """
    n = timeline["horizon_months"]
    year_idx = timeline["year_index"]

    cogs_reproducer = [0.0] * n
    cogs_fattening = [0.0] * n
    admin_expenses = [0.0] * n
    feed_cost_monthly = [0.0] * n       # total feed: repro + fatt (backward compat)
    feed_cost_repro_monthly = [0.0] * n # reproducer feed (shown under cogs_reproducer in P&L)
    feed_cost_fatt_monthly = [0.0] * n  # fattening feed (shown under cogs_fattening in P&L)
    admin_payroll_monthly = [0.0] * n  # Admin staff payroll for P&L detail
    land_tax_monthly = [0.0] * n  # Land tax for P&L detail

    # Per-line COGS detail arrays (all negative)
    cost_vet = [0.0] * n
    cost_rfid = [0.0] * n
    cost_tags = [0.0] * n
    cost_insurance = [0.0] * n
    cost_payroll = [0.0] * n
    cost_current = [0.0] * n
    cost_other = [0.0] * n

    # Pre-resolve admin payroll array (avoid re-allocation in loop)
    _staff_admin_payroll = staff.get("monthly_payroll_admin", [0.0] * n)

    # Derive cow price per kg from purchase price (тг)
    purchase_price_cow = enriched_input.get("purchase_price_cow", 550_000)
    cow_price_per_kg = purchase_price_cow / 600  # тг/кг

    # Pasture area for land tax
    pasture_area = enriched_input.get("pasture_area", 0)

    for t in range(n):
        yr = year_idx[t]
        inf = (1 + CPI_ANNUAL) ** (yr - 1) if yr > 1 else 1.0

        avg_livestock = herd["total_avg_livestock"][t]
        total_eop = sum(
            herd[g]["eop"][t]
            for g in ["cows", "bulls", "calves", "heifers", "steers"]
        )
        cows_eop = herd["cows"]["eop"][t]

        # --- 10 COGS lines (all negative) ---

        # 205: Корма (already negative from feeding module)
        # DEF-OPEX-FATTENING-01 (2026-04-17): split feed between cogs_reproducer
        # (groups 1-6) and cogs_fattening (groups 7-8). Previously total_fattening
        # was silently dropped — STEER/BULL_CALF rations never reached P&L.
        feed_cost_repro = feeding["total_reproducer"][t]
        feed_cost_fatt = feeding.get("total_fattening", [0.0] * n)[t]
        feed_cost = feed_cost_repro + feed_cost_fatt
        feed_cost_monthly[t] = feed_cost
        feed_cost_repro_monthly[t] = feed_cost_repro
        feed_cost_fatt_monthly[t] = feed_cost_fatt

        # 206: Вет препараты (6500 тг/гол/год)
        vet_cost = -(6500 * avg_livestock * inf) / 1000 / 12
        cost_vet[t] = vet_cost

        # 207: RFID-чипы (500 тг/гол/год on avg livestock)
        rfid_cost = -(500 * avg_livestock * inf) / 1000 / 12
        cost_rfid[t] = rfid_cost

        # 208: Ушные бирки (500 тг/гол/год on total EOP)
        tags_cost = -(500 * total_eop * inf) / 1000 / 12
        cost_tags[t] = tags_cost

        # 209: Страхование маточного поголовья
        # Formula: cow_price_per_kg × inf × 600кг × cows_eop / 1000 × 1.5% × 20% / 12
        insurance = -(cow_price_per_kg * inf * 600 * cows_eop) / 1000 * 0.015 * 0.2 / 12
        cost_insurance[t] = insurance

        # 210: ФОТ штат — production only (from staff module, ensure negative)
        # Includes all production positions (herders managed via StaffTab)
        payroll = -abs(staff.get("monthly_payroll_production", staff["monthly_payroll"])[t])
        cost_payroll[t] = payroll

        # 213: Текущие расходы (200 тыс.тг base × inflation)
        current_expenses = -(200 * inf)
        cost_current[t] = current_expenses

        # 214: Прочие расходы (0.1% от выручки скота — positive revenue × -0.001)
        other = -0.001 * max(0, revenue["livestock_revenue"][t])
        cost_other[t] = other

        cogs_reproducer[t] = (
            feed_cost_repro + vet_cost + rfid_cost + tags_cost + insurance
            + payroll + current_expenses + other
        )
        cogs_fattening[t] = feed_cost_fatt

        # --- Admin expenses (NEGATIVE) ---
        # Land tax: 12.05 тг/га × pasture_area / 1000 (тыс.тг/год) / 12 (monthly)
        land_tax = -(12.05 * pasture_area) / 1000 / 12
        land_tax_monthly[t] = land_tax

        # Admin staff payroll (from staff module, ensure negative)
        admin_pay = -abs(_staff_admin_payroll[t])
        admin_payroll_monthly[t] = admin_pay

        admin_expenses[t] = land_tax + admin_pay

    total_cogs = [
        cogs_reproducer[t] + cogs_fattening[t]
        for t in range(n)
    ]

    return {
        "cogs_reproducer": cogs_reproducer,
        "cogs_fattening": cogs_fattening,
        "total_cogs": total_cogs,
        "admin_expenses": admin_expenses,
        "feed_cost": feed_cost_monthly,
        "feed_cost_repro": feed_cost_repro_monthly,
        "feed_cost_fatt": feed_cost_fatt_monthly,
        "admin_payroll": admin_payroll_monthly,
        "land_tax": land_tax_monthly,
        "detail": {
            "cost_vet": cost_vet,
            "cost_rfid": cost_rfid,
            "cost_tags": cost_tags,
            "cost_insurance": cost_insurance,
            "cost_payroll": cost_payroll,
            "cost_current": cost_current,
            "cost_other": cost_other,
            "admin_payroll": admin_payroll_monthly,
        },
    }
