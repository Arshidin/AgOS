"""Модуль ОБОРОТ СТАДА — КРИТИЧЕСКИЙ (Часть 4.3 спецификации).

Ошибка здесь каскадирует на кормовую модель, OPEX, выручку, Cash Flow, NPV.

6 групп: коровы, быки, телята, тёлки, бычки, доращивание.
Каждая группа — массив 120 элементов (помесячно).
"""


def calculate_herd_turnover(
    timeline: dict,
    enriched_input: dict,
    refs: dict,
) -> dict:
    """Полный расчёт оборота стада на 120 месяцев.

    Returns:
        dict с ключами: cows, bulls, calves, heifers, steers, fattening,
                        total_avg_livestock, total_sold, sale_summary
    """
    n = timeline["horizon_months"]
    mi = timeline["month_index"]

    initial_cows = enriched_input["initial_cows"]
    initial_bulls = enriched_input["initial_bulls"]
    capacity = enriched_input["reproducer_capacity"]
    bull_ratio = enriched_input["bull_ratio"]
    calving_mi = enriched_input["calving_month_index"]

    # Допущения
    cow_culling_annual = 0.15
    cow_mortality_annual = 0.03
    bull_culling_annual = 0.25
    bull_mortality_annual = 0.03
    calf_yield = 0.85
    heifer_mortality = 0.03
    steer_mortality = 0.03

    cow_culling_m = cow_culling_annual / 12
    cow_mortality_m = cow_mortality_annual / 12
    bull_culling_m = bull_culling_annual / 12
    bull_mortality_m = bull_mortality_annual / 12

    # Предположение: одна ферма, farms_added[0]=1, остальные 0
    farms_added = [0] * n
    farms_added[0] = 1
    farm_count = [1] * n

    # === Инициализация массивов ===
    # Коровы (§4.3.1)
    cows_bop = [0.0] * n
    cows_purchased = [0.0] * n
    cows_from_heifers = [0.0] * n
    cows_culled = [0.0] * n
    cows_mortality = [0.0] * n
    cows_interim = [0.0] * n
    cows_sold_breeding = [0.0] * n
    cows_eop = [0.0] * n
    cows_avg = [0.0] * n

    # Быки (§4.3.2)
    bulls_bop = [0.0] * n
    bulls_purchased = [0.0] * n
    bulls_from_steers = [0.0] * n
    bulls_culled = [0.0] * n
    bulls_mortality = [0.0] * n
    bulls_eop = [0.0] * n
    bulls_avg = [0.0] * n

    # Телята (§4.3.3)
    calves_bop = [0.0] * n
    new_calves = [0.0] * n
    calves_before_split = [0.0] * n
    to_heifers = [0.0] * n
    to_steers = [0.0] * n
    calves_eop = [0.0] * n
    calves_avg = [0.0] * n

    # Тёлки (§4.3.4)
    heifers_bop = [0.0] * n
    heifers_from_calves = [0.0] * n
    heifer_mort = [0.0] * n
    heifers_before = [0.0] * n
    heifers_to_cows = [0.0] * n
    heifers_sold_breeding = [0.0] * n
    heifers_eop = [0.0] * n
    heifers_avg = [0.0] * n

    # Бычки (§4.3.5)
    steers_bop = [0.0] * n
    steers_from_calves = [0.0] * n
    steers_to_bulls = [0.0] * n
    steer_mort = [0.0] * n
    steers_sold = [0.0] * n
    steers_eop = [0.0] * n
    steers_avg = [0.0] * n

    # === Расчёт по месяцам ===
    for t in range(n):
        # -- Коровы --
        cows_bop[t] = 0.0 if t == 0 else cows_eop[t - 1]
        cows_purchased[t] = initial_cows * farms_added[t]
        cows_from_heifers[t] = -heifers_to_cows[t]

        # Выбраковка: Excel показывает ежегодную выбраковку (lump sum)
        # 15% от BOP, применяется 1 раз в год начиная с месяца 15
        # (ежегодно: месяц 15, 27, 39, ... = каждые 12 мес после первой)
        if mi[t] >= 15 and (mi[t] - 15) % 12 == 0:
            cows_culled[t] = -(cow_culling_annual * cows_bop[t])
        else:
            cows_culled[t] = 0.0

        cows_mortality[t] = -cow_mortality_m * cows_bop[t]

        cows_interim[t] = (
            cows_bop[t]
            + cows_purchased[t]
            + cows_from_heifers[t]
            + cows_culled[t]
            + cows_mortality[t]
        )

        # Продажа племенных тёлок при превышении мощности
        over = cows_interim[t] - min(cows_interim[t], capacity * farm_count[t])
        cows_sold_breeding[t] = -min(over, over) if over > 0 else 0.0

        cows_eop[t] = cows_interim[t] + cows_sold_breeding[t]
        cows_avg[t] = (cows_bop[t] + cows_purchased[t] + cows_eop[t]) / 2

        # -- Быки --
        bulls_bop[t] = 0.0 if t == 0 else bulls_eop[t - 1]
        bulls_purchased[t] = initial_bulls * farms_added[t]
        bulls_from_steers[t] = -steers_to_bulls[t]

        # Падёж быков: ежемесячно начиная с месяца 18
        if mi[t] >= 18:
            bulls_mortality[t] = -bull_mortality_m * bulls_bop[t]
        else:
            bulls_mortality[t] = 0.0

        # Выбраковка быков: ежегодно lump sum, начиная с месяца 28
        # (аналогично коровам — годовой процент одним платежом)
        if mi[t] >= 28 and (mi[t] - 28) % 12 == 0:
            bulls_culled[t] = -(bull_culling_annual * bulls_bop[t])
        else:
            bulls_culled[t] = 0.0

        bulls_eop[t] = (
            bulls_bop[t]
            + bulls_purchased[t]
            + bulls_from_steers[t]
            + bulls_culled[t]
            + bulls_mortality[t]
        )
        bulls_avg[t] = (bulls_bop[t] + bulls_purchased[t] + bulls_eop[t]) / 2

        # -- Телята (§4.3.3) --
        calves_bop[t] = 0.0 if t == 0 else calves_eop[t - 1]

        # Приплод ТОЛЬКО в месяце отёла (первый + каждые 12 мес.)
        is_calving_month = (
            mi[t] == calving_mi
            or (mi[t] > calving_mi and (mi[t] - calving_mi) % 12 == 0)
        )
        if is_calving_month:
            new_calves[t] = calf_yield * (cows_bop[t] + cows_purchased[t])
        else:
            new_calves[t] = 0.0

        calves_before_split[t] = calves_bop[t] + new_calves[t]
        to_heifers[t] = -calves_before_split[t] * 0.5
        to_steers[t] = -calves_before_split[t] * 0.5
        calves_eop[t] = calves_before_split[t] + to_heifers[t] + to_steers[t]
        calves_avg[t] = (calves_bop[t] + calves_eop[t]) / 2

        # -- Тёлки (§4.3.4) --
        heifers_bop[t] = 0.0 if t == 0 else heifers_eop[t - 1]
        heifers_from_calves[t] = -to_heifers[t]
        # Monthly mortality on existing stock (BOP), rate = annual / 12
        heifer_mort[t] = -(heifer_mortality / 12) * heifers_bop[t] if heifers_bop[t] > 0 else 0.0
        heifers_before[t] = heifers_bop[t] + heifers_from_calves[t] + heifer_mort[t]

        # ⚠️ Перевод в маточное = 0 в шаблоне (строка 85)
        # TODO: реализовать OFFSET логику (~18 мес. от рождения)
        heifers_to_cows[t] = 0.0

        # Продажа племенных тёлок (зеркало cows_sold_breeding)
        over_h = cows_interim[t] - min(cows_interim[t], capacity * farm_count[t])
        heifers_sold_breeding[t] = -over_h if over_h > 0 else 0.0

        heifers_eop[t] = heifers_before[t] + heifers_to_cows[t]
        heifers_avg[t] = (
            heifers_bop[t] + heifers_from_calves[t] + heifers_eop[t]
        ) / 2

        # -- Бычки (§4.3.5) --
        steers_bop[t] = 0.0 if t == 0 else steers_eop[t - 1]
        steers_from_calves[t] = -to_steers[t]

        # Перевод в быки: потребность = коэф × маточное_нп - (быки_нп + выбр. + падёж)
        bull_need = bull_ratio * cows_bop[t] - (
            bulls_bop[t] + bulls_culled[t] + bulls_mortality[t]
        )
        steers_to_bulls[t] = -max(0, bull_need)

        # Monthly mortality on existing stock (BOP), rate = annual / 12
        steer_mort[t] = -(steer_mortality / 12) * steers_bop[t] if steers_bop[t] > 0 else 0.0
        steers_sold[t] = 0.0  # продажа на откорм (настраивается)

        steers_eop[t] = (
            steers_bop[t]
            + steers_from_calves[t]
            + steers_to_bulls[t]
            + steer_mort[t]
            + steers_sold[t]
        )
        steers_avg[t] = (steers_bop[t] + steers_eop[t]) / 2

    # Доращивание (§4.3.6) — мощность 0 в образце
    fattening_eop = [0.0] * n
    fattening_avg = [0.0] * n

    # Сводка
    total_avg = [
        cows_avg[t] + bulls_avg[t] + calves_avg[t] + heifers_avg[t] + steers_avg[t]
        for t in range(n)
    ]
    total_sold = [
        (-cows_sold_breeding[t])
        + (-cows_culled[t])
        + (-bulls_culled[t])
        + (-steers_sold[t])
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
