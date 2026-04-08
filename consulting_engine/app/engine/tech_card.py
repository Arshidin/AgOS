"""Технологическая карта репродуктора — производственный цикл.

Рассчитывает календарь событий на 120 месяцев исходя из:
- Даты старта проекта
- Сценария отёла (Зимний/Летний)
- Настраиваемых параметров (стельность, отъём, доращивание)

Выход: массив фаз с привязкой к конкретным месяцам.
Используется оборотом стада для определения КОГДА происходят события.

Естественный цикл КРС мясного направления:
  Закуп + карантин → Подготовка → Случка → Стельность (9 мес) →
  Отёл → Подсосный период → Отъём → Доращивание → Реализация
  Параллельно: восстановление коров → следующая случка → цикл
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TechCardParams:
    """Настраиваемые параметры технологической карты."""

    # Сценарий отёла: определяет месяц случки и отёла
    calving_scenario: str = "Зимний"  # "Зимний" или "Летний"

    # Периоды (в месяцах)
    quarantine_months: int = 3          # Карантин + адаптация после закупа
    pre_breeding_months: int = 2        # Подготовка к случке
    breeding_duration_months: int = 2   # Длительность случной кампании
    gestation_months: int = 9           # Стельность
    suckling_months: int = 7            # Подсосный период (до отъёма)
    weaning_age_months: int = 7         # Возраст отъёма телят

    # Доращивание
    fattening_enabled: bool = False     # С доращиванием или без
    fattening_months: int = 6           # Срок доращивания (если включено)

    # Бонитировка и реализация
    culling_month_offset: int = 3       # Месяцев после отъёма до выбраковки/продажи


@dataclass
class PhaseEvent:
    """Одно событие/фаза в технологической карте."""

    name: str               # Название фазы
    name_ru: str            # Название на русском
    start_month: int        # Месяц от старта проекта (1-based)
    end_month: int          # Последний месяц фазы (включительно)
    cycle: int              # Номер цикла (1 = первый, 2 = второй, ...)
    color: str = ""         # Цвет для UI (hex)


@dataclass
class TechCard:
    """Полная технологическая карта на 120 месяцев."""

    phases: list[PhaseEvent] = field(default_factory=list)
    params: TechCardParams = field(default_factory=TechCardParams)

    # Ключевые месяцы (1-based) для оборота стада
    calving_months: list[int] = field(default_factory=list)      # Месяцы отёла
    weaning_months: list[int] = field(default_factory=list)      # Месяцы отъёма
    sale_months: list[int] = field(default_factory=list)         # Месяцы реализации
    breeding_months: list[int] = field(default_factory=list)     # Месяцы случки


def calculate_tech_card(
    enriched_input: dict,
    timeline: dict,
    params: TechCardParams | None = None,
) -> dict:
    """Рассчитать технологическую карту на весь горизонт проекта.

    Args:
        enriched_input: параметры проекта (calving_scenario, etc.)
        timeline: временная ось (120 месяцев, dates, calendar_year)
        params: настраиваемые параметры (если None — используем дефолты)

    Returns:
        dict с phases, calving_months, weaning_months, sale_months, params
    """
    if params is None:
        params = TechCardParams(
            calving_scenario=enriched_input.get("calving_scenario", "Зимний"),
            fattening_enabled=enriched_input.get("fattening_enabled", False),
            fattening_months=enriched_input.get("fattening_months", 6),
        )

    n = timeline["horizon_months"]  # 120
    dates = timeline["dates"]
    cal_years = timeline["calendar_year"]

    phases: list[dict] = []
    calving_months: list[int] = []
    weaning_months: list[int] = []
    sale_months: list[int] = []
    breeding_months: list[int] = []

    # === Определяем месяц первой случки от старта ===
    # Закуп в месяц 1 → карантин → подготовка → случка
    first_breeding_start = 1 + params.quarantine_months + params.pre_breeding_months
    # Для зимнего отёла: случка май-июнь (чтобы отёл в январе-феврале)
    # Для летнего: случка ноябрь-декабрь (отёл в августе-сентябре)

    # Первый цикл: жёстко от старта
    m = 1  # текущий месяц

    # Фаза 1: Закуп + карантин
    phases.append({
        "name": "quarantine",
        "name_ru": "Закуп + карантин",
        "start_month": 1,
        "end_month": params.quarantine_months,
        "cycle": 0,
        "color": "#E0E0E0",
    })

    # Фаза 2: Подготовка к случке
    prep_start = params.quarantine_months + 1
    prep_end = prep_start + params.pre_breeding_months - 1
    phases.append({
        "name": "pre_breeding",
        "name_ru": "Подготовка к случке",
        "start_month": prep_start,
        "end_month": prep_end,
        "cycle": 0,
        "color": "#C8E6C9",
    })

    # === Циклические фазы (повторяются каждый год) ===
    # Определяем месяц первой случки
    breeding_start = first_breeding_start
    cycle = 1

    while breeding_start <= n:
        breeding_end = min(breeding_start + params.breeding_duration_months - 1, n)

        # Случка
        phases.append({
            "name": "breeding",
            "name_ru": "Случная кампания",
            "start_month": breeding_start,
            "end_month": breeding_end,
            "cycle": cycle,
            "color": "#66BB6A",
        })
        breeding_months.append(breeding_start)

        # Стельность (начинается с конца случки)
        gestation_start = breeding_end + 1
        gestation_end = min(gestation_start + params.gestation_months - 1, n)
        if gestation_start <= n:
            phases.append({
                "name": "gestation",
                "name_ru": "Стельность",
                "start_month": gestation_start,
                "end_month": gestation_end,
                "cycle": cycle,
                "color": "#CE93D8",
            })

        # Отёл
        calving_month = gestation_end + 1
        if calving_month <= n:
            phases.append({
                "name": "calving",
                "name_ru": "Отёл",
                "start_month": calving_month,
                "end_month": calving_month,
                "cycle": cycle,
                "color": "#FF8A65",
            })
            calving_months.append(calving_month)

        # Подсосный период
        suckling_start = calving_month + 1
        suckling_end = min(calving_month + params.suckling_months - 1, n)
        if suckling_start <= n:
            phases.append({
                "name": "suckling",
                "name_ru": "Подсосный период",
                "start_month": suckling_start,
                "end_month": suckling_end,
                "cycle": cycle,
                "color": "#FFF176",
            })

        # Отъём
        weaning_month = suckling_end + 1
        if weaning_month <= n:
            phases.append({
                "name": "weaning",
                "name_ru": "Отъём телят",
                "start_month": weaning_month,
                "end_month": weaning_month,
                "cycle": cycle,
                "color": "#FFD54F",
            })
            weaning_months.append(weaning_month)

        # Доращивание (если включено)
        if params.fattening_enabled and weaning_month <= n:
            fatt_start = weaning_month + 1
            fatt_end = min(fatt_start + params.fattening_months - 1, n)
            phases.append({
                "name": "fattening",
                "name_ru": "Доращивание молодняка",
                "start_month": fatt_start,
                "end_month": fatt_end,
                "cycle": cycle,
                "color": "#FFB74D",
            })
            sale_month = fatt_end + 1
        else:
            sale_month = weaning_month + params.culling_month_offset

        # Реализация / выбраковка / бонитировка
        if sale_month <= n:
            sale_end = min(sale_month + 2, n)  # 3-месячный период
            phases.append({
                "name": "sale",
                "name_ru": "Выбраковка и реализация",
                "start_month": sale_month,
                "end_month": sale_end,
                "cycle": cycle,
                "color": "#EF9A9A",
            })
            sale_months.append(sale_month)

        # Следующий цикл: случка через 12 месяцев от предыдущей
        breeding_start = breeding_start + 12
        cycle += 1

    # === Сформировать timeline-привязку (для каждого месяца — список активных фаз) ===
    monthly_phases: list[list[str]] = [[] for _ in range(n)]
    for phase in phases:
        for m in range(phase["start_month"] - 1, min(phase["end_month"], n)):
            monthly_phases[m].append(phase["name"])

    return {
        "phases": phases,
        "calving_months": calving_months,
        "weaning_months": weaning_months,
        "sale_months": sale_months,
        "breeding_months": breeding_months,
        "monthly_phases": monthly_phases,
        "params": {
            "calving_scenario": params.calving_scenario,
            "quarantine_months": params.quarantine_months,
            "pre_breeding_months": params.pre_breeding_months,
            "breeding_duration_months": params.breeding_duration_months,
            "gestation_months": params.gestation_months,
            "suckling_months": params.suckling_months,
            "weaning_age_months": params.weaning_age_months,
            "fattening_enabled": params.fattening_enabled,
            "fattening_months": params.fattening_months,
        },
    }
