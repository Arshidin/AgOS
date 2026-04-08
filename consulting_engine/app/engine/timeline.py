"""Модуль Timeline — временна́я ось 120 месяцев (Часть 4.1 спецификации).

Горизонт: 10 лет = 120 месяцев
Гранулярность: помесячно
Даты: EOMONTH от старта
"""

import calendar
from datetime import date
from dataclasses import dataclass


@dataclass
class MonthlyTimeline:
    """Временна́я ось проекта."""

    dates: list[date]  # EOMONTH от старта, 120 элементов
    days_in_month: list[int]  # кол-во дней в каждом месяце
    month_index: list[int]  # 1..120
    year_index: list[int]  # 1..10+
    calendar_year: list[int]  # 2026..2036


def _eomonth(year: int, month: int) -> date:
    """Последний день месяца."""
    _, last_day = calendar.monthrange(year, month)
    return date(year, month, last_day)


def calculate_timeline(start_date: date, horizon_months: int = 120) -> dict:
    """Построение временно́й оси от даты старта.

    Args:
        start_date: дата старта проекта (будет использован EOMONTH)
        horizon_months: горизонт в месяцах (по умолчанию 120 = 10 лет)

    Returns:
        dict с массивами dates, days_in_month, month_index, year_index, calendar_year
    """
    # Нормализация: стартовая дата → конец месяца
    start_eo = _eomonth(start_date.year, start_date.month)

    dates: list[str] = []
    days_in_month: list[int] = []
    month_index: list[int] = []
    year_index: list[int] = []
    calendar_year: list[int] = []

    current_year = start_eo.year
    current_month = start_eo.month

    for i in range(horizon_months):
        eo = _eomonth(current_year, current_month)

        dates.append(eo.isoformat())
        days_in_month.append(eo.day)
        month_index.append(i + 1)
        year_index.append((i // 12) + 1)
        calendar_year.append(current_year)

        # Следующий месяц
        current_month += 1
        if current_month > 12:
            current_month = 1
            current_year += 1

    return {
        "dates": dates,
        "days_in_month": days_in_month,
        "month_index": month_index,
        "year_index": year_index,
        "calendar_year": calendar_year,
        "horizon_months": horizon_months,
    }
