"""Модуль CAPEX — капитальные затраты (Часть 4.5 спецификации).

4 блока из CAPEX sheet:
  Rows 5-29:  Основная ферма (FAC/INF/PAD коды)
  Rows 32-38: Пастбища
  Rows 41-49: Техника
  Rows 52-71: Инструменты

Стоимость = Column H (col 8) в Excel.
Расходы на работы = 6%, Непредвиденные = 2.5%

Амортизация:
  Здания/сооружения: 20 лет
  Техника: 5 лет
"""


def calculate_capex(enriched_input: dict, refs: dict) -> dict:
    """Расчёт капитальных затрат.

    Uses reference data for infrastructure_norms if available,
    otherwise falls back to hardcoded Excel values.

    Returns:
        dict с блоками farm, pasture, equipment, tools + totals + depreciation
    """
    capacity = enriched_input.get("reproducer_capacity", 300)
    calving = enriched_input.get("calving_scenario", "Зимний")

    # Lookup from reference data
    infra_norms = {
        item["code"]: item["data"]
        for item in refs.get("infrastructure_norms", [])
    }

    # =====================================================
    # Block 1: Основная ферма (rows 5-26)
    # =====================================================
    farm_items = [
        {"code": "FAC-015", "name": "Навес для техники", "cost": 9_750_000},
        {"code": "INF-001", "name": "Жилой дом", "cost": 30_000_000},
        {"code": "INF-002", "name": "Резервуар для питьевой воды", "cost": 1_000_000},
        {"code": "INF-003", "name": "Скважина", "cost": 15_000_000},
        {"code": "FAC-014", "name": "Автовесы", "cost": 1_500_000},
        {"code": "FAC-019", "name": "КПП с санпропускником", "cost": 2_000_000},
        {"code": "INF-004", "name": "Наружные сети электроснабжения", "cost": 11_185_000},
        {"code": "INF-005", "name": "Скотомогильник", "cost": 4_000_000},
        {"code": "FAC-015b", "name": "Зернохранилище 2000м²", "cost": 18_000_000},
        {"code": "INF-006", "name": "Трап для погрузки КРС", "cost": 500_000},
        {"code": "FAC-012", "name": "Крытое помещение для отёла", "cost": 16_000_000},
        {"code": "FAC-014b", "name": "Раскол-деление", "cost": 980_000},
        {"code": "FAC-008", "name": "Накопитель на 300 голов", "cost": 1_200_000},
        {"code": "FAC-015c", "name": "Открытая площадка для силоса", "cost": 1_500_000},
        {"code": "FAC-001", "name": "Общий ангар", "cost": 30_000_000},
        {"code": "FAC-013", "name": "Изолятор на 15 голов", "cost": 9_999_960},
        {"code": "FAC-009", "name": "Открытый загон для имущества", "cost": 1_035_000},
        {"code": "PAD-001", "name": "Загон для 30 коров КП", "cost": 2_484_000},
        {"code": "PAD-007", "name": "Загон для быков-производителей", "cost": 2_484_000},
        {"code": "INF-007", "name": "Ветрозащита", "cost": 2_484_000},
        {"code": "INF-008", "name": "Кормовой стол", "cost": 1_035_000},
        {"code": "FAC-017", "name": "Тёплая поилка", "cost": 1_449_000},
    ]

    farm_subtotal = sum(item["cost"] for item in farm_items)
    farm_work_surcharge = farm_subtotal * 0.06
    farm_contingency = (farm_subtotal + farm_work_surcharge) * 0.025
    farm_total = farm_subtotal + farm_work_surcharge + farm_contingency

    # =====================================================
    # Block 2: Пастбища (rows 32-35)
    # =====================================================
    pasture_items = [
        {"name": "Мобильный вагончик", "qty": 1, "unit_cost": 4_000_000, "cost": 4_000_000},
        {"name": "Поилки от скважин", "qty": 2, "unit_cost": 8_800_000, "cost": 17_600_000},
        {"name": "Скважина", "qty": 1, "unit_cost": 3_000_000, "cost": 3_000_000},
        {"name": "Ограждение пастбищ", "qty": 1, "unit_cost": 18_800_000, "cost": 18_800_000},
    ]

    pasture_subtotal = sum(item["cost"] for item in pasture_items)
    pasture_work_surcharge = pasture_subtotal * 0.06
    pasture_contingency = pasture_subtotal * 0.025  # On items only (not items+work)
    pasture_total = pasture_subtotal + pasture_work_surcharge + pasture_contingency

    # =====================================================
    # Block 3: Техника (rows 41-48)
    # =====================================================
    equipment_items = [
        {"name": "Колёсный трактор 100 л.с.", "cost": 20_000_000},
        {"name": "Кун с ковшом и стогометом", "cost": 3_500_000},
        {"name": "Кормораздатчик (миксер)", "cost": 10_000_000},
        {"name": "Зернодробилка", "cost": 3_000_000},
        {"name": "Прицеп самосвальный", "cost": 10_000_000},
        {"name": "Прицеп для перевозки скота", "cost": 5_000_000},
        {"name": "Прицеп с ёмкостью для воды", "cost": 1_500_000},
        {"name": "Бензиновые генераторы", "cost": 400_000},
    ]

    equipment_total = sum(item["cost"] for item in equipment_items)

    # =====================================================
    # Block 4: Инструменты (rows 52-70)
    # =====================================================
    tools_items = [
        {"name": "Считыватель чипов", "cost": 50_000},
        {"name": "Электрический погонщик", "cost": 30_000},
        {"name": "Станок для фиксации", "cost": 2_000_000},
        {"name": "Электронные весы", "cost": 150_000},
        {"name": "Вакцинаторы", "cost": 175_000},
        {"name": "Дренчер", "cost": 10_000},
        {"name": "Копытные ножи", "cost": 30_000},
        {"name": "Молокоотсос", "cost": 120_000},
        {"name": "Поилки для молока", "cost": 100_000},
        {"name": "Термо чемодан", "cost": 50_000},
        {"name": "Огнетушитель", "cost": 75_000},
        {"name": "Набор лопат и вил", "cost": 150_000},
        {"name": "Набор инструментов (ферма)", "cost": 300_000},
        {"name": "Набор инструментов (мелкий)", "cost": 100_000},
        {"name": "Тачка", "cost": 250_000},
        {"name": "Ручные рации", "cost": 50_000},
        {"name": "Спецодежда", "cost": 200_000},
        {"name": "Набор инструментов для копыт", "cost": 50_000},
        {"name": "Спутниковые антенны", "cost": 350_000},
    ]

    tools_total = sum(item["cost"] for item in tools_items)

    # =====================================================
    # Grand total
    # =====================================================
    # Buildings = farm + pasture (depreciation 20 years)
    buildings_total = farm_total + pasture_total
    # Equipment = техника + инструменты (depreciation 5 years)
    equip_and_tools = equipment_total + tools_total

    grand_total = buildings_total + equip_and_tools

    # Depreciation (monthly)
    depr_buildings = buildings_total / (20 * 12) / 1000  # тыс. тг/мес
    depr_equipment = equip_and_tools / (5 * 12) / 1000   # тыс. тг/мес

    return {
        "farm": {
            "items": farm_items,
            "subtotal": farm_subtotal,
            "work_surcharge": farm_work_surcharge,
            "contingency": farm_contingency,
            "total": farm_total,
        },
        "pasture": {
            "items": pasture_items,
            "subtotal": pasture_subtotal,
            "work_surcharge": pasture_work_surcharge,
            "contingency": pasture_contingency,
            "total": pasture_total,
        },
        "equipment": {
            "items": equipment_items,
            "total": equipment_total,
        },
        "tools": {
            "items": tools_items,
            "total": tools_total,
        },
        "buildings_total": buildings_total,
        "equipment_and_tools_total": equip_and_tools,
        "grand_total": grand_total,
        "grand_total_thousands": grand_total / 1000,
        "depreciation_buildings_monthly": depr_buildings,
        "depreciation_equipment_monthly": depr_equipment,
    }
