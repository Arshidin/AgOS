"""Pydantic schemas — Input/Output contracts for the calculation engine."""

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class ProjectInput(BaseModel):
    """Мастер-параметры проекта (Часть 4.2 спецификации)."""

    # Общие
    project_start_date: date = Field(description="Дата старта проекта")
    initial_cows: int = Field(ge=1, description="Закуп маточного поголовья")
    reproducer_capacity: int = Field(ge=1, description="Мощность репродуктора")
    purchase_price_cow: int = Field(default=550_000, description="Цена 1 коровы, тг")
    purchase_price_bull: int = Field(default=650_000, description="Цена 1 быка, тг")
    bull_ratio: float = Field(default=1 / 15, description="Норма быков на маточное")
    pasture_norm_ha: int = Field(default=10, description="Га пастбищ на 1 голову")
    calving_scenario: str = Field(default="Летний", description="Летний / Зимний")
    farm_type: str = Field(default="beef_reproducer")

    # Коэффициенты стада (% годовых)
    calf_yield: float = Field(default=0.85, description="Коэффициент приплода (0.85 = 85%)")
    cow_mortality_rate: float = Field(default=0.03, description="Падёж коров годовой (0.03 = 3%)")
    cow_culling_rate: float = Field(default=0.15, description="Выбраковка коров годовая (0.15 = 15%)")
    bull_mortality_rate: float = Field(default=0.03, description="Падёж быков годовой")
    bull_culling_rate: float = Field(default=0.25, description="Выбраковка быков годовая")
    heifer_mortality_rate: float = Field(default=0.03, description="Падёж тёлок/бычков годовой")

    # Переключатели
    subsidy_switch: int = Field(default=1, description="1=с субсидиями, 2=без")
    wc_loan_switch: int = Field(default=1, description="1=с займами ПОС, 2=без")
    bioasset_revaluation_switch: int = Field(default=1, description="1=без, 2=с")
    equity_share: float = Field(default=0.15, description="Доля собственного участия")

    # Финансирование
    capex_loan_term_years: int = Field(default=10)
    capex_grace_period_years: int = Field(default=2)
    capex_loan_share: float = Field(default=0.9)
    livestock_loan_rate: float = Field(default=0.05)
    livestock_loan_term_years: int = Field(default=10)
    livestock_loan_grace_period_years: int = Field(default=2)
    livestock_loan_share: float = Field(default=0.9)
    wc_loan_rate: float = Field(default=0.06)
    wc_loan_term_months: int = Field(default=15)


class CalculateRequest(BaseModel):
    """Запрос на расчёт от frontend."""

    project_id: str
    organization_id: str
    input_params: ProjectInput


class CalculateResponse(BaseModel):
    """Ответ после расчёта."""

    version_id: str
    version_number: int
    results: dict  # Все 11 модулей


class TimelineOutput(BaseModel):
    """Временная ось — 120 месяцев."""

    months: list[int]
    dates: list[str]
    days_in_month: list[int]
    year_index: list[int]
    calendar_year: list[int]


class HerdGroup(BaseModel):
    """Одна группа стада — массивы по 120 элементов."""

    bop: list[float]
    purchased: Optional[list[float]] = None
    born: Optional[list[float]] = None
    transfers_in: Optional[list[float]] = None
    culled: Optional[list[float]] = None
    mortality: Optional[list[float]] = None
    sold: Optional[list[float]] = None
    eop: list[float]
    avg: list[float]


class HerdTurnoverOutput(BaseModel):
    """Модуль оборота стада — 6 групп."""

    cows: HerdGroup
    bulls: HerdGroup
    calves: HerdGroup
    heifers: HerdGroup
    steers: HerdGroup
    fattening: HerdGroup
    total_avg_livestock: list[float]
    total_sold: list[float]
