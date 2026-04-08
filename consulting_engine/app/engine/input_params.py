"""Модуль Input — валидация и обогащение мастер-параметров (Часть 4.2)."""

import math
from app.models.schemas import ProjectInput


def validate_and_enrich_input(params: ProjectInput) -> dict:
    """Валидация входных параметров + вычисление производных.

    Производные параметры:
    - initial_bulls = ROUNDUP(initial_cows × bull_ratio)
    - pasture_area = pasture_norm_ha × reproducer_capacity
    - total_initial_livestock = initial_cows + initial_bulls

    Returns:
        dict с исходными + производными параметрами
    """
    d = params.model_dump(mode="json")

    # Производные параметры
    d["initial_bulls"] = math.ceil(params.initial_cows * params.bull_ratio)
    d["pasture_area"] = params.pasture_norm_ha * params.reproducer_capacity
    d["total_initial_livestock"] = d["initial_cows"] + d["initial_bulls"]

    # Стоимость закупа скота
    d["livestock_purchase_cost"] = (
        params.initial_cows * params.purchase_price_cow
        + d["initial_bulls"] * params.purchase_price_bull
    ) / 1000  # тыс. тг

    # Месяц первого отёла (от старта проекта)
    if params.calving_scenario == "Зимний":
        d["calving_month_index"] = 18
    else:
        d["calving_month_index"] = 12

    return d
