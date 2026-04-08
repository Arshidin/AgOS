"""Orchestrator — запуск 11 модулей в порядке зависимостей.

Граф зависимостей (Часть 4.12 спецификации):
Input → CAPEX → Loans → P&L + Cash Flow
Input → Оборот стада → Кормовая модель → OPEX → P&L
                     → Реализация (голов) → P&L (выручка)
                     → Среднее поголовье → OPEX (вет, RFID)
Input → Staff → ФОТ → OPEX
Input → WACC → NPV/IRR
P&L → Cash Flow → NPV/IRR → Output
"""

from app.models.schemas import ProjectInput
from app.engine.timeline import calculate_timeline
from app.engine.input_params import validate_and_enrich_input
from app.engine.herd_turnover import calculate_herd_turnover
from app.engine.capex import calculate_capex
from app.engine.staff import calculate_staff
from app.engine.wacc import calculate_wacc_rates
from app.engine.feeding_model import calculate_feeding
from app.engine.revenue import calculate_revenue
from app.engine.opex import calculate_opex
from app.engine.pnl import calculate_pnl
from app.engine.loans import calculate_loans
from app.engine.cashflow import calculate_cashflow


def run_calculation(
    input_params: ProjectInput,
    reference_data: list[dict],
) -> dict:
    """Полный расчёт финансовой модели — 11 модулей по порядку.

    Returns:
        dict с ключами: timeline, input, herd, capex, staff, wacc,
                        feeding, revenue, opex, pnl, loans, cashflow
    """
    # Группировка справочников по категориям
    refs = _group_references(reference_data)

    # 1. Временна́я ось (120 месяцев)
    timeline = calculate_timeline(input_params.project_start_date)

    # 2. Обогащённый Input
    enriched = validate_and_enrich_input(input_params)

    # 3. Оборот стада — КРИТИЧЕСКИЙ модуль
    herd = calculate_herd_turnover(timeline, enriched, refs)

    # 4. CAPEX
    capex = calculate_capex(enriched, refs)

    # 5. ФОТ
    staff = calculate_staff(timeline, enriched, refs)

    # 6. WACC (ставки)
    wacc_rates = calculate_wacc_rates(enriched, refs)

    # 7. Кормовая модель
    feeding = calculate_feeding(timeline, enriched, herd, refs)

    # 8. Выручка + субсидии
    revenue = calculate_revenue(timeline, enriched, herd, refs)

    # 9. OPEX
    opex = calculate_opex(timeline, enriched, herd, feeding, staff, revenue, refs)

    # 10. P&L
    pnl = calculate_pnl(timeline, revenue, opex, capex, staff)

    # 11. Loans
    loans = calculate_loans(timeline, enriched, capex, wacc_rates)

    # 12. Cash Flow + NPV/IRR
    cashflow = calculate_cashflow(
        timeline, enriched, pnl, loans, capex, herd, wacc_rates
    )

    return {
        "timeline": timeline,
        "input": enriched,
        "herd": herd,
        "capex": capex,
        "staff": staff,
        "wacc": {**wacc_rates, **cashflow.get("valuation", {})},
        "feeding": feeding,
        "revenue": revenue,
        "opex": opex,
        "pnl": pnl,
        "loans": loans,
        "cashflow": cashflow,
    }


def _group_references(reference_data: list[dict]) -> dict[str, list[dict]]:
    """Группировка справочников по category."""
    refs: dict[str, list[dict]] = {}
    for item in reference_data:
        cat = item["category"]
        if cat not in refs:
            refs[cat] = []
        refs[cat].append(item)
    return refs
