"""Pydantic schemas — Input/Output contracts for the calculation engine."""

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class StaffPosition(BaseModel):
    """Одна позиция штатного расписания."""

    code: str = Field(description="Код позиции (director, vet, cook...)")
    name: str = Field(description="Название позиции")
    category: str = Field(default="production", description="production | admin")
    fte: float = Field(default=1.0, ge=0, le=10, description="Единиц (0.3, 0.5, 1, 2...)")
    net_salary: float = Field(default=0, ge=0, description="ЗП нетто, тыс. тг/мес")


# Default 5 positions (backward-compatible with hardcoded staff.py)
DEFAULT_STAFF_POSITIONS = [
    StaffPosition(code="director", name="Директор фермы", category="production", fte=1.0, net_salary=600),
    StaffPosition(code="vet", name="Ветеринар", category="production", fte=0.5, net_salary=400),
    StaffPosition(code="cook", name="Повар", category="production", fte=0.5, net_salary=300),
    StaffPosition(code="tractor", name="Тракторист", category="production", fte=1.0, net_salary=400),
    StaffPosition(code="herder", name="Пастух", category="production", fte=1.0, net_salary=250),
    StaffPosition(code="herder", name="Пастух", category="production", fte=1.0, net_salary=250),
    StaffPosition(code="accountant", name="Бухгалтер", category="admin", fte=0.3, net_salary=300),
]


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
    weaning_months: int = Field(default=6, ge=1, le=12,
        description="Длительность молочного периода (мес). Телята первые N мес после рождения "
                    "получают рацион SUCKLING_CALF, затем — рацион тёлки/бычка. Default 6 мес.")
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

    # Параметры привеса и веса реализации
    birth_weight_kg: float = Field(default=30.0, ge=15, le=50,
        description="Вес телёнка при рождении, кг (мясные породы КЗ: 28-40)")
    daily_gain_steer_pasture: float = Field(default=0.850, ge=0.3, le=1.5,
        description="Привес бычков на пастбище (лето), кг/день")
    daily_gain_steer_stall: float = Field(default=0.650, ge=0.3, le=1.2,
        description="Привес бычков на стойле (зима), кг/день")
    daily_gain_heifer_pasture: float = Field(default=0.810, ge=0.3, le=1.3,
        description="Привес тёлок на пастбище (лето), кг/день")
    daily_gain_heifer_stall: float = Field(default=0.600, ge=0.3, le=1.0,
        description="Привес тёлок на стойле (зима), кг/день")
    cow_culled_weight_kg: float = Field(default=600.0, ge=350, le=800,
        description="Вес выбракованной коровы, кг")
    bull_culled_weight_kg: float = Field(default=750.0, ge=500, le=1100,
        description="Вес выбракованного быка, кг")

    # Стратегия реализации бычков
    steer_sale_age_months: int = Field(default=0, ge=0, le=24,
        description="Возраст реализации бычков (мес). 0=продажа в декабре (legacy)")

    # Штатное расписание
    staff_positions: list[StaffPosition] = Field(
        default_factory=lambda: list(DEFAULT_STAFF_POSITIONS),
        description="Штатное расписание проекта",
    )

    # Сезон выпаса (DEF-RATION-03 / ADR-RATION-01)
    pasture_start_month: int = Field(default=5, ge=1, le=12,
        description="Month pasture season starts (1=Jan, 5=May default for Kazakhstan central belt)")
    pasture_end_month: int = Field(default=10, ge=1, le=12,
        description="Month pasture season ends (1=Jan, 10=Oct default for Kazakhstan central belt)")

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
