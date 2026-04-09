"""Модуль расчёта веса реализации (WeightCalc).

Рассчитывает живой вес животных при продаже/переводе на основе:
  W_sale = birth_weight + Σ(daily_gain[season] × days_in_month)

Привесы зависят от сезона:
  Пастбище (май-октябрь): более высокие привесы (свободный выпас, зелёная масса)
  Стойло (ноябрь-апрель): более низкие привесы (сено, концентраты)

Параметры поступают из ProjectInput через enriched_input["weight_params"].
"""


def _is_pasture(month_in_year: int) -> bool:
    """May-October = пастбище, November-April = стойло."""
    return 5 <= month_in_year <= 10


def _extract_calendar_month(date_iso: str) -> int:
    """Extract month (1-12) from ISO date string 'YYYY-MM-DD'."""
    return int(date_iso[5:7])


def calculate_weight_model(
    timeline: dict,
    enriched_input: dict,
    herd: dict,
) -> dict:
    """Расчёт живого веса при реализации для бычков и тёлок.

    Для каждой когорты отёла (calving event) отслеживает накопление веса
    от рождения до момента продажи (бычки) или перевода в коровы (тёлки).

    Зрелые животные (коровы/быки при выбраковке) — фиксированный вес
    из параметров проекта.

    Args:
        timeline: временная ось (120 месяцев) с dates, days_in_month
        enriched_input: обогащённые параметры проекта (weight_params)
        herd: результат herd_turnover — массивы born/sold/to_cows

    Returns:
        dict с:
            steer_sale_weight: [float]*120 — вес бычка при продаже (кг), 0 если нет продажи
            heifer_transfer_weight: [float]*120 — вес тёлки при переводе, 0 если нет перевода
            cow_culled_weight: float — вес выбракованной коровы (кг)
            bull_culled_weight: float — вес выбракованного быка (кг)
            birth_weight_kg: float — вес при рождении (для UI)
            daily_gains: dict — привесы по категориям/сезонам (для UI)
    """
    wp = enriched_input["weight_params"]
    birth_weight = wp["birth_weight_kg"]
    gains = wp["daily_gains"]

    n = timeline["horizon_months"]
    dates = timeline["dates"]
    days = timeline["days_in_month"]

    calves_born = herd["calves"]["born"]
    steers_sold = herd["steers"]["sold"]
    heifers_to_cows = herd["heifers"]["to_cows"]

    steer_sale_weight = [0.0] * n
    heifer_transfer_weight = [0.0] * n

    # Для каждой когорты отёла — трекинг веса от рождения до реализации
    for t_birth in range(n):
        if calves_born[t_birth] <= 0:
            continue

        steer_wt = birth_weight
        heifer_wt = birth_weight
        steer_done = False
        heifer_done = False

        for m in range(t_birth, n):
            if steer_done and heifer_done:
                break

            cal_month = _extract_calendar_month(dates[m])
            season = "pasture" if _is_pasture(cal_month) else "stall"

            # Первый месяц: рождение в середине → половина дней роста
            gain_days = days[m] / 2.0 if m == t_birth else float(days[m])

            # Накопление веса
            if not steer_done:
                steer_wt += gains["steer"][season] * gain_days

            if not heifer_done:
                heifer_wt += gains["heifer"][season] * gain_days

            # Проверка: продажа бычков в этом месяце?
            if not steer_done and steers_sold[m] < -0.01:
                steer_sale_weight[m] = steer_wt
                steer_done = True

            # Проверка: перевод тёлок в коровы в этом месяце?
            if not heifer_done and heifers_to_cows[m] < -0.01:
                heifer_transfer_weight[m] = heifer_wt
                heifer_done = True

    return {
        "steer_sale_weight": steer_sale_weight,
        "heifer_transfer_weight": heifer_transfer_weight,
        "cow_culled_weight": wp["cow_culled_weight_kg"],
        "bull_culled_weight": wp["bull_culled_weight_kg"],
        "birth_weight_kg": birth_weight,
        "daily_gains": gains,
    }
