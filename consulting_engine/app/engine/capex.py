"""Модуль CAPEX — ADR-CAPEX-01 data-driven engine + legacy fallback.

Priority chain (plan .claude/plans/q1-rosy-lollipop.md):
  Priority 1: project override via enriched_input['infra_items_override'].
              Applied INSIDE the Priority 2 path (per-item include/qty/material).
  Priority 2: refs['infrastructure_norms'] × refs['construction_materials']
              × refs['capex_surcharges']. Scales with capacity, calving scenario,
              feeding groups (cows_eop/bulls_eop/...), pasture area.
  Priority 3: hardcoded Excel numbers — _legacy_calculate_capex(). Triggers
              ONLY when refs['infrastructure_norms'] is empty (pre-seed deploys,
              Тест 7 backward compatibility).

Output shape is stable across priority paths; existing consumers
(loans.py, cashflow.py, pnl.py) read grand_total + depreciation_*_monthly
without knowing which path ran. New key `depreciation_per_block` is additive
for UI per-block display (CapexTab).

Seed reference: d09_consulting.sql §ADR-CAPEX-01 Phase 1.
Excel reference: Docs/Zengi.Farm_Model farm_020426_v10_WintSumm.xlsx lists CAPEX, rows 5-87.
"""

import math
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# Surcharge defaults (Excel rows 27-28, 36-37). Honours pasture contingency quirk
# (items_only base) vs farm contingency (items_plus_work). Overridden by
# refs['capex_surcharges'][0]['data'] when seed row exists.
# ─────────────────────────────────────────────────────────────────────────────
_DEFAULT_SURCHARGES = {
    "works_rate": 0.06,
    "contingency_rate": 0.025,
    "applies_to_blocks": ["farm", "pasture"],
    "contingency_base_by_block": {"farm": "items_plus_work", "pasture": "items_only"},
}


def calculate_capex(enriched_input: dict, refs: dict, herd: Optional[dict] = None) -> dict:
    """ADR-CAPEX-01 dispatcher. See module docstring for priority chain.

    Args:
        enriched_input: validated project params from input_params.py.
        refs: grouped reference data (infrastructure_norms,
              construction_materials, capex_surcharges, ...).
        herd: optional herd turnover dict. Unlocks applies_to values like
              cows_eop/bulls_eop/calves_avg/heifers_avg/steers_avg.

    Returns:
        dict with farm/pasture/equipment/tools + totals + depreciation.
        Adds new key priority_used (2 or 3) for observability.
    """
    norms = refs.get("infrastructure_norms") or []
    if not norms:
        result = _legacy_calculate_capex(enriched_input)
        result["priority_used"] = 3
        return result
    return _data_driven_calculate_capex(enriched_input, refs, herd)


# ─────────────────────────────────────────────────────────────────────────────
# Priority 2 — data-driven path
# ─────────────────────────────────────────────────────────────────────────────

def _data_driven_calculate_capex(enriched_input: dict, refs: dict,
                                  herd: Optional[dict]) -> dict:
    """Priority 2 CAPEX engine. Pure function — no DB / network I/O."""
    materials = {
        m["code"]: float((m.get("data") or {}).get("cost_per_m2") or 0)
        for m in (refs.get("construction_materials") or [])
        if m.get("code")
    }
    surcharges = _load_surcharges(refs)

    capacity = int(enriched_input.get("reproducer_capacity") or 300)
    calving = enriched_input.get("calving_scenario") or "Зимний"
    pasture_norm_ha = int(enriched_input.get("pasture_norm_ha") or 10)
    pasture_area_ha = capacity * pasture_norm_ha

    enclosed_code = enriched_input.get("construction_material_enclosed") or "sandwich"
    support_code = enriched_input.get("construction_material_support") or "light_frame"
    # Resolution falls through to catalog defaults if user picks a material that
    # disappeared from the catalog (defensive — should never happen with valid seed).
    enclosed_price = materials.get(enclosed_code) or materials.get("sandwich") or 25000.0
    support_price = materials.get(support_code) or materials.get("light_frame") or 15000.0

    overrides_list = enriched_input.get("infra_items_override") or []
    overrides = {
        ov["code"]: ov
        for ov in overrides_list
        if isinstance(ov, dict) and ov.get("code")
    }

    norms_sorted = sorted(
        refs.get("infrastructure_norms") or [],
        key=lambda n: (
            int((n.get("data") or {}).get("display_order") or 0),
            n.get("code") or "",
        ),
    )

    blocks: dict[str, list[dict]] = {
        "farm": [], "pasture": [], "equipment": [], "tools": [],
    }

    for norm in norms_sorted:
        code = norm.get("code")
        data = norm.get("data") or {}
        block = data.get("block")
        if block not in blocks:
            # Norms with missing or unknown block are skipped to avoid silently
            # adding them to a default bucket. Admin sees empty-block item in /admin/capex.
            continue

        ov = overrides.get(code) or {}
        if ov.get("include") is False:
            continue

        head_count = _resolve_heads(
            data.get("applies_to") or "capacity",
            capacity, pasture_area_ha, herd,
        )

        cost_model = data.get("cost_model") or "fixed_per_project"
        material_target = data.get("material_target")
        price_per_m2 = _resolve_price(
            ov, data, material_target, enclosed_price, support_price, materials
        )
        qty_effective = _effective_qty(
            cost_model, data, ov, head_count, pasture_area_ha
        )
        area_m2, raw_cost = _compute_cost(
            cost_model, data, head_count, price_per_m2,
            qty_effective, ov,
        )

        # Calving scenario multiplier — typically {"Зимний": 1.0, "Летний": 0.5}
        # for seasonally used facilities like FAC-012 (крытое отёла).
        multipliers = data.get("calving_scenario_multiplier") or {}
        mult_raw = multipliers.get(calving)
        try:
            mult = float(mult_raw) if mult_raw is not None else 1.0
        except (TypeError, ValueError):
            mult = 1.0
        cost = raw_cost * mult

        cost = _safe_int_round(cost)

        blocks[block].append({
            "code": code,
            "name": data.get("name_ru") or code,
            "cost": cost,
            "cost_model": cost_model,
            "applies_to": data.get("applies_to"),
            "material_target": material_target,
            "material_resolved": _material_resolved_label(
                ov, data, material_target, enclosed_code, support_code,
            ),
            "depreciation_years": int(data.get("depreciation_years") or 0),
            "qty": qty_effective,
            "area_m2": area_m2,
            "calving_multiplier": mult,
            "included": True,
        })

    result_blocks: dict[str, dict] = {}
    for bname, items in blocks.items():
        subtotal = sum(i["cost"] for i in items)
        if bname in surcharges.get("applies_to_blocks", []):
            works_rate = float(surcharges.get("works_rate", 0) or 0)
            conting_rate = float(surcharges.get("contingency_rate", 0) or 0)
            base_mode = (surcharges.get("contingency_base_by_block") or {}).get(
                bname, "items_plus_work"
            )
            work_surch = subtotal * works_rate
            if base_mode == "items_only":
                contingency = subtotal * conting_rate
            else:  # items_plus_work
                contingency = (subtotal + work_surch) * conting_rate
        else:
            work_surch = 0.0
            contingency = 0.0
        total = subtotal + work_surch + contingency

        result_blocks[bname] = {
            "items": items,
            "subtotal": _safe_int_round(subtotal),
            "work_surcharge": _safe_int_round(work_surch),
            "contingency": _safe_int_round(contingency),
            "total": _safe_int_round(total),
        }

    farm_total = result_blocks["farm"]["total"]
    pasture_total = result_blocks["pasture"]["total"]
    equipment_total = result_blocks["equipment"]["total"]
    tools_total = result_blocks["tools"]["total"]

    buildings_total = farm_total + pasture_total
    equip_and_tools = equipment_total + tools_total
    grand_total = buildings_total + equip_and_tools

    # Per-item depreciation aggregation — replaces the old 20-years-buildings /
    # 5-years-equipment heuristic. Items with depreciation_years=0 are ignored.
    depr_per_block: dict[str, float] = {}
    for bname, block_data in result_blocks.items():
        total_depr = 0.0
        for item in block_data["items"]:
            yrs = item.get("depreciation_years") or 0
            if yrs > 0 and item["cost"] > 0:
                total_depr += item["cost"] / (yrs * 12) / 1000  # тыс. тг/мес
        depr_per_block[bname] = total_depr

    depr_buildings = depr_per_block["farm"] + depr_per_block["pasture"]
    depr_equipment = depr_per_block["equipment"] + depr_per_block["tools"]

    return {
        "farm": result_blocks["farm"],
        "pasture": result_blocks["pasture"],
        "equipment": result_blocks["equipment"],
        "tools": result_blocks["tools"],
        "buildings_total": buildings_total,
        "equipment_and_tools_total": equip_and_tools,
        "grand_total": grand_total,
        "grand_total_thousands": grand_total / 1000,
        "depreciation_buildings_monthly": depr_buildings,
        "depreciation_equipment_monthly": depr_equipment,
        # Additive (does not break legacy consumers):
        "depreciation_per_block": depr_per_block,
        "priority_used": 2,
        "materials_used": {"enclosed": enclosed_code, "support": support_code},
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_surcharges(refs: dict) -> dict:
    rows = refs.get("capex_surcharges") or []
    data = dict(_DEFAULT_SURCHARGES)
    data["contingency_base_by_block"] = dict(_DEFAULT_SURCHARGES["contingency_base_by_block"])
    data["applies_to_blocks"] = list(_DEFAULT_SURCHARGES["applies_to_blocks"])
    if rows:
        seed = rows[0].get("data") or {}
        for k in ("works_rate", "contingency_rate"):
            if k in seed:
                data[k] = seed[k]
        if "applies_to_blocks" in seed:
            data["applies_to_blocks"] = list(seed["applies_to_blocks"] or [])
        if "contingency_base_by_block" in seed:
            data["contingency_base_by_block"] = dict(
                seed["contingency_base_by_block"] or {}
            )
    return data


def _resolve_heads(applies_to: str, capacity: int, pasture_area_ha: int,
                   herd: Optional[dict]) -> float:
    """Resolve head count for a norm's applies_to. Defensive fallback to capacity."""
    if applies_to == "capacity":
        return float(capacity)
    if applies_to == "always":
        # Marker: caller must not multiply by head_count for fixed_* models.
        return 1.0
    if applies_to == "pasture_area_ha":
        return float(pasture_area_ha)
    if herd is None:
        return float(capacity)
    if applies_to == "cows_eop":
        return _first_value((herd.get("cows") or {}).get("eop"))
    if applies_to == "bulls_eop":
        return _first_value((herd.get("bulls") or {}).get("eop"))
    if applies_to == "calves_avg":
        return _avg_year1((herd.get("calves") or {}).get("avg"))
    if applies_to == "heifers_avg":
        return _avg_year1((herd.get("heifers") or {}).get("avg"))
    if applies_to == "steers_avg":
        return _avg_year1((herd.get("steers") or {}).get("avg"))
    return float(capacity)


def _first_value(arr) -> float:
    if not arr:
        return 0.0
    try:
        return float(arr[0] or 0)
    except (TypeError, ValueError, IndexError):
        return 0.0


def _avg_year1(arr) -> float:
    if not arr:
        return 0.0
    slice12 = arr[:12]
    if not slice12:
        return 0.0
    try:
        return sum(float(v or 0) for v in slice12) / len(slice12)
    except (TypeError, ValueError):
        return 0.0


def _resolve_price(ov: dict, data: dict, material_target,
                   enclosed_price: float, support_price: float,
                   materials: dict) -> float:
    """Price per m² resolution for area-based cost models.

    Priority: project override (material_override) → norm bespoke
    (unit_cost_per_m2_override) → catalog via material_target → 0.
    Seed uses the bespoke override on 10 Excel-parity items (ADR-CAPEX-01).
    """
    mat_override = ov.get("material_override")
    if mat_override and mat_override in materials:
        return float(materials[mat_override])
    norm_price = data.get("unit_cost_per_m2_override")
    if norm_price is not None:
        try:
            return float(norm_price)
        except (TypeError, ValueError):
            pass
    if material_target == "enclosed":
        return float(enclosed_price)
    if material_target == "support":
        return float(support_price)
    return 0.0


def _material_resolved_label(ov: dict, data: dict, material_target,
                             enclosed_code: str, support_code: str):
    """Human-readable label for what material drove the price (debug/UI aid)."""
    mat_override = ov.get("material_override")
    if mat_override:
        return f"override:{mat_override}"
    if data.get("unit_cost_per_m2_override") is not None:
        return "bespoke_price"
    if material_target == "enclosed":
        return f"enclosed:{enclosed_code}"
    if material_target == "support":
        return f"support:{support_code}"
    return None


def _effective_qty(cost_model: str, data: dict, ov: dict,
                   head_count: float, pasture_area_ha: int) -> float:
    """Resolve effective quantity. qty_override on project always wins."""
    ov_qty = ov.get("qty_override")
    if ov_qty is not None:
        try:
            return float(ov_qty)
        except (TypeError, ValueError):
            pass
    if cost_model == "fixed_qty":
        return float(data.get("fixed_qty") or 0)
    if cost_model == "per_head_unit":
        return float(head_count)
    if cost_model == "per_area_ha":
        divisor = float(data.get("area_divisor_ha") or 0)
        if divisor <= 0:
            return 0.0
        return float(math.ceil(pasture_area_ha / divisor))
    # area_per_head / fixed_area / fixed_per_project — conceptual qty = 1.
    return 1.0


def _compute_cost(cost_model: str, data: dict, head_count: float,
                  price_per_m2: float, qty_effective: float,
                  ov: dict):
    """Return (area_m2, cost) for one norm per its cost_model.

    area_m2 is None for non-area models (used by UI to format display).
    unit_cost_override on a project-level item override (Priority 1) wins
    over the norm's unit_cost / fixed_cost for qty-based / fixed models.
    """
    unit_override = ov.get("unit_cost_override")

    def _unit_or(override, fallback_key):
        if override is not None:
            try:
                return float(override)
            except (TypeError, ValueError):
                pass
        return float(data.get(fallback_key) or 0)

    if cost_model == "area_per_head":
        area_per_head = float(data.get("area_per_head_m2") or 0)
        area_m2 = area_per_head * head_count
        return area_m2, area_m2 * price_per_m2

    if cost_model == "fixed_area":
        area_m2 = float(data.get("fixed_area_m2") or 0)
        return area_m2, area_m2 * price_per_m2

    if cost_model == "per_head_unit":
        unit = _unit_or(unit_override, "unit_cost")
        return None, head_count * unit

    if cost_model == "fixed_qty":
        unit = _unit_or(unit_override, "unit_cost")
        return None, qty_effective * unit

    if cost_model == "fixed_per_project":
        fixed_cost = _unit_or(unit_override, "fixed_cost")
        return None, fixed_cost

    if cost_model == "per_area_ha":
        unit = _unit_or(unit_override, "unit_cost")
        return None, qty_effective * unit

    # Unknown cost_model — do not silently spend 0, surface in UI as included=True, cost=0
    return None, 0.0


def _safe_int_round(val) -> int:
    """Defensive int-round. Guards against NaN/Inf (orchestrator sanitizes later)."""
    try:
        if val is None:
            return 0
        f = float(val)
        if f != f or f in (float("inf"), float("-inf")):
            return 0
        return int(round(f))
    except (TypeError, ValueError):
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# Priority 3 — legacy fallback (preserved verbatim from pre-ADR-CAPEX-01)
# ─────────────────────────────────────────────────────────────────────────────

def _legacy_calculate_capex(enriched_input: dict) -> dict:
    """Priority 3 — hardcoded Excel numbers, used when refs is empty.

    Exists for Тест 7 backward compatibility and for pre-seed deploys.
    Output shape matches _data_driven_calculate_capex; caller stamps
    priority_used=3.
    """
    capacity = enriched_input.get("reproducer_capacity", 300)
    calving = enriched_input.get("calving_scenario", "Зимний")

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
