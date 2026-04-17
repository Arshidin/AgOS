"""Модуль ОБОРОТ СТАДА — КРИТИЧЕСКИЙ (Часть 4.3 спецификации).

Полная 10-летняя модель (120 месяцев) для beef_reproducer.
Ошибка здесь каскадирует на кормовую модель, OPEX, выручку, Cash Flow, NPV.

6 групп: коровы, быки, телята, тёлки, бычки, доращивание.

Excel target trajectory (annual cows EOP):
  Year 1: 198, Year 2: 163, Year 3: 201, Year 4: 248, Year 5: 300 (capacity)
  Years 6-12: 300 (stable)

Key mechanics:
  - Calving at month_index=18 (winter), then every 12 months
  - Heifers mature to cows ~18 months after birth (OFFSET logic)
  - Annual culling (15% cows, 25% bulls) as lump-sum
  - Breeding sales when cows exceed reproducer_capacity
"""

import math


def calculate_herd_turnover(
    timeline: dict,
    enriched_input: dict,
    refs: dict,
) -> dict:
    """Полный расчёт оборота стада на 120 месяцев."""

    n = timeline["horizon_months"]
    mi = timeline["month_index"]  # 1-based: 1..120

    initial_cows = enriched_input["initial_cows"]
    initial_bulls = enriched_input["initial_bulls"]
    capacity = enriched_input["reproducer_capacity"]
    bull_ratio = enriched_input["bull_ratio"]
    calving_mi = enriched_input["calving_month_index"]  # 18 for winter, 12 for summer

    # Rates — from configurable input params (with defaults)
    CALF_YIELD = enriched_input.get("calf_yield", 0.85)
    COW_CULLING_ANNUAL = enriched_input.get("cow_culling_rate", 0.15)
    COW_MORTALITY_MONTHLY = enriched_input.get("cow_mortality_rate", 0.03) / 12
    BULL_CULLING_ANNUAL = enriched_input.get("bull_culling_rate", 0.25)
    BULL_MORTALITY_MONTHLY = enriched_input.get("bull_mortality_rate", 0.03) / 12
    HEIFER_MORTALITY_MONTHLY = enriched_input.get("heifer_mortality_rate", 0.03) / 12
    STEER_MORTALITY_MONTHLY = enriched_input.get("steer_mortality_rate", enriched_input.get("heifer_mortality_rate", 0.03)) / 12

    # Стратегия реализации бычков (0=декабрь legacy, 7/12/18=возраст в мес.)
    steer_sale_age = enriched_input.get("steer_sale_age_months", 0)

    # Когортный трекинг бычков: [[birth_mi, count], ...]
    # Нужен для продажи по возрасту (steer_sale_age > 0)
    steer_cohorts: list[list] = []

    # Farm setup: one farm, added at month 1
    farms_added = [0] * n
    farms_added[0] = 1
    farm_count = [1] * n

    # ================================================================
    # Initialize all arrays
    # ================================================================
    # Cows
    cows_bop = [0.0] * n
    cows_purchased = [0.0] * n
    cows_from_heifers = [0.0] * n
    cows_culled = [0.0] * n
    cows_mortality = [0.0] * n
    cows_interim = [0.0] * n
    cows_sold_breeding = [0.0] * n
    cows_eop = [0.0] * n
    cows_avg = [0.0] * n

    # Bulls
    bulls_bop = [0.0] * n
    bulls_purchased = [0.0] * n
    bulls_from_steers = [0.0] * n
    bulls_culled = [0.0] * n
    bulls_mortality = [0.0] * n
    bulls_eop = [0.0] * n
    bulls_avg = [0.0] * n

    # Calves
    calves_bop = [0.0] * n
    new_calves = [0.0] * n
    to_heifers = [0.0] * n
    to_steers = [0.0] * n
    calves_mort = [0.0] * n
    calves_eop = [0.0] * n
    calves_avg = [0.0] * n

    # Heifers
    heifers_bop = [0.0] * n
    heifers_from_calves = [0.0] * n
    heifer_mort = [0.0] * n
    heifers_to_cows = [0.0] * n
    heifers_sold_breeding = [0.0] * n
    heifers_eop = [0.0] * n
    heifers_avg = [0.0] * n

    # Steers
    steers_bop = [0.0] * n
    steers_from_calves = [0.0] * n
    steers_to_bulls = [0.0] * n
    steer_mort = [0.0] * n
    steers_sold = [0.0] * n
    steers_eop = [0.0] * n
    steers_avg = [0.0] * n

    # (heifer maturation is now lump-sum at calving, no OFFSET tracking needed)

    # ================================================================
    # Monthly calculation loop
    # ================================================================
    for t in range(n):

        # === COWS PHASE 1 (BOP + purchased — needed by calves) ===
        cows_bop[t] = 0.0 if t == 0 else cows_eop[t - 1]
        cows_purchased[t] = initial_cows * farms_added[t]

        # === CALVES (uses cows_bop + cows_purchased) ===
        calves_bop[t] = 0.0 if t == 0 else calves_eop[t - 1]

        is_calving = (
            mi[t] == calving_mi
            or (mi[t] > calving_mi and (mi[t] - calving_mi) % 12 == 0)
        )
        if is_calving:
            new_calves[t] = CALF_YIELD * (cows_bop[t] + cows_purchased[t])
        else:
            new_calves[t] = 0.0

        # Падёж телят: 0 на этапе распределения.
        # 3%/год падёж применяется ЕЖЕМЕСЯЧНО на BOP тёлок и бычков (0.25%/мес).
        # Учёт здесь был бы задвоением — удалён.
        calves_mort[t] = 0.0
        calves_after_mortality = calves_bop[t] + new_calves[t] + calves_mort[t]

        # Распределение: 50/50 на тёлок и бычков (после падежа)
        to_heifers[t] = -calves_after_mortality * 0.5
        to_steers[t] = -calves_after_mortality * 0.5
        calves_eop[t] = 0.0  # телята сразу распределяются
        calves_avg[t] = (calves_bop[t] + calves_eop[t]) / 2

        # === HEIFERS ===
        # Excel annual: heifers transfer to cows WITHIN the same year they're born.
        # Monthly: heifers arrive from calves at calving (month 18, 30, 42...).
        # They transfer to cows within the SAME calving event.
        # Excel annual: Row 85 = -Row 84 (all heifers_before → cows, same year).
        # Monthly: skip first calving (month 18) because Excel monthly shows zeros.
        # From SECOND calving (month 30) onward: at calving month, previous
        # year's heifers (accumulated in heifers_bop) transfer to cows.

        heifers_bop[t] = 0.0 if t == 0 else heifers_eop[t - 1]
        heifers_from_calves[t] = -to_heifers[t]  # positive = inflow

        # Mortality: monthly on BOP (Excel row 82: =IF(mi>17, -G82*BOP, 0))
        if heifers_bop[t] > 0 and mi[t] > 17:
            heifer_mort[t] = -(HEIFER_MORTALITY_MONTHLY * heifers_bop[t])
        else:
            heifer_mort[t] = 0.0

        heifers_before = heifers_bop[t] + heifers_from_calves[t] + heifer_mort[t]

        # Transfer to cows: at December of each year (annual year-end settlement).
        # Excel annual: Row 85 = -Row 84 (all heifers transfer, heifers_eop = 0).
        # In monthly: transfer at the last month of each calendar year (December).
        # This ensures heifers born in Jan 2028 transfer by Dec 2028 (same calendar year).
        is_december = timeline['dates'][t].endswith('-12-31') if isinstance(timeline['dates'][t], str) else False
        if is_december and heifers_before > 0 and mi[t] > calving_mi:
            heifers_to_cows[t] = -heifers_before
        else:
            heifers_to_cows[t] = 0.0

        # Track for steer sale timing
        is_transfer_calving = abs(heifers_to_cows[t]) > 0.01

        heifers_eop[t] = max(0.0, heifers_before + heifers_to_cows[t])

        heifers_avg[t] = (heifers_bop[t] + heifers_from_calves[t] + heifers_eop[t]) / 2

        # === COWS PHASE 2 (culling, breeding sales, EOP) ===
        # cows_bop and cows_purchased already set in Phase 1
        cows_from_heifers[t] = -heifers_to_cows[t]  # positive = inflow from heifers

        # Culling: verified from Excel monthly — annual lump at month 15, 27, 39...
        # Pattern: every 12 months starting from month 15
        if mi[t] >= 15 and (mi[t] - 15) % 12 == 0:
            cows_culled[t] = -(COW_CULLING_ANNUAL * cows_bop[t])
        else:
            cows_culled[t] = 0.0

        # Mortality: monthly
        cows_mortality[t] = -(COW_MORTALITY_MONTHLY * cows_bop[t])

        cows_interim[t] = (
            cows_bop[t]
            + cows_purchased[t]
            + cows_from_heifers[t]
            + cows_culled[t]
            + cows_mortality[t]
        )

        # Breeding sales: excess over capacity
        over_capacity = cows_interim[t] - capacity * farm_count[t]
        cows_sold_breeding[t] = -max(0.0, over_capacity)

        cows_eop[t] = cows_interim[t] + cows_sold_breeding[t]
        cows_avg[t] = (cows_bop[t] + cows_purchased[t] + cows_eop[t]) / 2

        # === BULLS PHASE 1 (BOP + culled + mortality — needed by steers) ===
        bulls_bop[t] = 0.0 if t == 0 else bulls_eop[t - 1]
        bulls_purchased[t] = initial_bulls * farms_added[t]

        # Mortality: starts month 18
        if mi[t] >= 18:
            bulls_mortality[t] = -(BULL_MORTALITY_MONTHLY * bulls_bop[t])
        else:
            bulls_mortality[t] = 0.0

        # Culling: monthly from mi>17 (Excel: =IF(mi>17, -$G63*BOP, 0))
        if mi[t] > 17:
            bulls_culled[t] = -(BULL_CULLING_ANNUAL / 12 * bulls_bop[t])
        else:
            bulls_culled[t] = 0.0

        # === STEERS (uses bulls_bop + bulls_culled + bulls_mortality) ===
        steers_bop[t] = 0.0 if t == 0 else steers_eop[t - 1]
        steers_from_calves[t] = -to_steers[t]  # positive = inflow

        # Track cohort for age-based sale
        if steers_from_calves[t] > 0.01:
            steer_cohorts.append([mi[t], steers_from_calves[t]])

        # Transfer steers→bulls: from spec §4.3.5
        # Need = bull_ratio × cows_bop - surviving bulls
        # Available steers = bop + from_calves (before mortality/sale)
        effective_bulls = bulls_bop[t] + bulls_culled[t] + bulls_mortality[t]
        bull_need = bull_ratio * cows_bop[t] - effective_bulls
        available_steers = steers_bop[t] + steers_from_calves[t]
        if bull_need > 0 and available_steers > 0:
            transfer = min(bull_need, available_steers)
            steers_to_bulls[t] = -transfer
            # Deduct from oldest cohort first
            remaining_transfer = transfer
            for cohort in steer_cohorts:
                if remaining_transfer <= 0:
                    break
                deduct = min(cohort[1], remaining_transfer)
                cohort[1] -= deduct
                remaining_transfer -= deduct
            steer_cohorts = [c for c in steer_cohorts if c[1] > 0.01]
        else:
            steers_to_bulls[t] = 0.0

        # Mortality: monthly 0.25% × BOP (аналогично тёлкам и коровам).
        # Было: годовой 3% одним ударом на inflow — заменено на ежемесячный
        # паттерн, чтобы: (а) не задваивать с heifer-падежом, (б) соответствовать
        # 3%/год суммарно на протяжении всей жизни бычка.
        if steers_bop[t] > 0 and mi[t] > 17:
            steer_mort[t] = -(STEER_MORTALITY_MONTHLY * steers_bop[t])
        else:
            steer_mort[t] = 0.0
        # Apply mortality proportionally to all cohorts
        if steer_mort[t] < -0.01:
            mort_abs = abs(steer_mort[t])
            total_in_cohorts = sum(c[1] for c in steer_cohorts)
            if total_in_cohorts > 0.01:
                for cohort in steer_cohorts:
                    cohort[1] -= mort_abs * (cohort[1] / total_in_cohorts)
                steer_cohorts = [c for c in steer_cohorts if c[1] > 0.01]

        steers_interim = (
            steers_bop[t]
            + steers_from_calves[t]
            + steers_to_bulls[t]
            + steer_mort[t]
        )

        # Sale logic: age-based (steer_sale_age > 0) or December legacy (0)
        if steer_sale_age > 0:
            # Sell cohorts that have reached target age
            sold_count = 0.0
            remaining_cohorts = []
            for cohort in steer_cohorts:
                age_months = mi[t] - cohort[0]
                if age_months >= steer_sale_age and cohort[1] > 0.01:
                    sold_count += cohort[1]
                else:
                    remaining_cohorts.append(cohort)
            steer_cohorts = remaining_cohorts
            steers_sold[t] = -sold_count if sold_count > 0.01 else 0.0
        else:
            # Legacy: sell all steers in December
            if is_december and mi[t] > calving_mi and steers_interim > 0:
                steers_sold[t] = -steers_interim
                steer_cohorts.clear()
            else:
                steers_sold[t] = 0.0

        steers_eop[t] = max(0.0, steers_interim + steers_sold[t])

        steers_avg[t] = (steers_bop[t] + steers_eop[t]) / 2

        # === BULLS PHASE 2 (from_steers, EOP) ===
        bulls_from_steers[t] = -steers_to_bulls[t]  # positive = inflow

        bulls_eop[t] = (
            bulls_bop[t]
            + bulls_purchased[t]
            + bulls_from_steers[t]
            + bulls_culled[t]
            + bulls_mortality[t]
        )
        if bulls_eop[t] < 0:
            bulls_eop[t] = 0.0

        bulls_avg[t] = (bulls_bop[t] + bulls_purchased[t] + bulls_eop[t]) / 2

    # ================================================================
    # Fattening (§4.3.6) — capacity 0 in beef_reproducer MVP
    # ================================================================
    fattening_eop = [0.0] * n
    fattening_avg = [0.0] * n

    # ================================================================
    # Summary
    # ================================================================
    total_avg = [
        cows_avg[t] + bulls_avg[t] + calves_avg[t] + heifers_avg[t] + steers_avg[t]
        for t in range(n)
    ]

    total_sold = [
        abs(cows_sold_breeding[t])
        + abs(cows_culled[t])
        + abs(bulls_culled[t])
        + abs(steers_sold[t])
        for t in range(n)
    ]

    return {
        "cows": {
            "bop": cows_bop,
            "purchased": cows_purchased,
            "from_heifers": cows_from_heifers,
            "culled": cows_culled,
            "mortality": cows_mortality,
            "sold_breeding": cows_sold_breeding,
            "eop": cows_eop,
            "avg": cows_avg,
        },
        "bulls": {
            "bop": bulls_bop,
            "purchased": bulls_purchased,
            "from_steers": bulls_from_steers,
            "culled": bulls_culled,
            "mortality": bulls_mortality,
            "eop": bulls_eop,
            "avg": bulls_avg,
        },
        "calves": {
            "bop": calves_bop,
            "born": [float(c) for c in new_calves],
            "mortality": calves_mort,
            "to_heifers": to_heifers,
            "to_steers": to_steers,
            "eop": calves_eop,
            "avg": calves_avg,
        },
        "heifers": {
            "bop": heifers_bop,
            "from_calves": heifers_from_calves,
            "mortality": heifer_mort,
            "to_cows": heifers_to_cows,
            "sold_breeding": heifers_sold_breeding,
            "eop": heifers_eop,
            "avg": heifers_avg,
        },
        "steers": {
            "bop": steers_bop,
            "from_calves": steers_from_calves,
            "to_bulls": steers_to_bulls,
            "mortality": steer_mort,
            "sold": steers_sold,
            "eop": steers_eop,
            "avg": steers_avg,
        },
        "fattening": {
            "bop": [0.0] * n,
            "eop": fattening_eop,
            "avg": fattening_avg,
        },
        "total_avg_livestock": total_avg,
        "total_sold": total_sold,
    }
