"""Orchestrator — запуск 12 модулей в порядке зависимостей.

Граф зависимостей (Часть 4.12 спецификации):
  1. timeline
  2. input (validate & enrich)
  3. herd (herd turnover — 120 months)
  4. capex
  5. staff
  6. wacc
  7. feeding (needs herd)
  8. revenue (needs herd)
  9. opex (needs feeding, staff, herd, revenue)
  10. loans (needs capex, wacc) ← BEFORE P&L
  11. pnl (needs revenue, opex, capex, staff, loans)
  12. cashflow (needs pnl, loans, capex, herd, wacc, enriched_input)
"""

from app.models.schemas import ProjectInput
from app.engine.timeline import calculate_timeline
from app.engine.input_params import validate_and_enrich_input
from app.engine.tech_card import calculate_tech_card
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
    extra_refs: dict | None = None,
) -> dict:
    """Полный расчёт финансовой модели — 12 модулей по порядку.

    Returns:
        dict с ключами: timeline, input, herd, capex, staff, wacc,
                        feeding, revenue, opex, loans, pnl, cashflow
    """
    # Группировка справочников по категориям
    refs = _group_references(reference_data)
    # Merge extra refs (feed_prices_d03, feed_consumption_norms, consulting_rations)
    if extra_refs:
        refs.update(extra_refs)

    # 1. Временна́я ось (120 месяцев)
    timeline = calculate_timeline(input_params.project_start_date)

    # 2. Обогащённый Input
    enriched = validate_and_enrich_input(input_params)

    # 2.5. Технологическая карта
    tech_card = calculate_tech_card(enriched, timeline)

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

    # 9. OPEX (себестоимость + административные расходы)
    opex = calculate_opex(timeline, enriched, herd, feeding, staff, revenue, refs)

    # 10. Loans (needs capex + wacc — MUST come before P&L)
    loans = calculate_loans(timeline, enriched, capex, wacc_rates)

    # 11. P&L (needs revenue, opex, capex, staff, loans)
    pnl = calculate_pnl(timeline, revenue, opex, capex, staff, loans)

    # 12. Cash Flow + NPV/IRR
    cashflow = calculate_cashflow(
        timeline, enriched, pnl, loans, capex, herd, wacc_rates
    )

    raw = {
        "timeline": timeline,
        "input": enriched,
        "tech_card": tech_card,
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

    return _sanitize(raw)


def _sanitize(obj):
    """Recursively replace NaN/Inf with None for JSON compliance."""
    import math
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


def _group_references(reference_data: list[dict]) -> dict[str, list[dict]]:
    """Группировка справочников по category."""
    refs: dict[str, list[dict]] = {}
    for item in reference_data:
        cat = item["category"]
        if cat not in refs:
            refs[cat] = []
        refs[cat].append(item)
    return refs
