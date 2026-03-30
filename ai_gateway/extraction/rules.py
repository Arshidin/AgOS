"""
AgOS AI Gateway — Entity Extraction Rules (Dok 5 §7)

C-NEW-1: Russian/Kazakh -> English DB code mapping.
Extraction != Write (P-AI-3): extract -> confirm -> write.
"""
import re
import logging
from typing import Any, Optional

logger = logging.getLogger("agos.gateway.extraction")

# C-NEW-1: Animal category mapping (Russian/Kazakh -> English DB codes)
ANIMAL_CATEGORY_MAPPING: dict[str, str] = {
    r"бычок.{0,10}(6.?12|6\s*мес)|бұзау.{0,10}6": "BULL_CALF",
    r"бычок.{0,10}(12.?24|год)|молодняк.{0,8}откорм": "STEER",
    r"телк|тёлк|қашар": "HEIFER_YOUNG",
    r"нетел": "HEIFER_PREG",
    r"корова|коров|сиыр": "COW",
    r"телён|телен|бұзау(?!.{0,10}6)": "YOUNG_CALF",
    r"выбрак.{0,10}коров": "COW_CULL",
    r"производител|племенн.{0,5}бык": "BULL_BREEDING",
    r"выбрак.{0,10}бык": "BULL_CULL",
}

_ANIMAL_PATTERNS = [
    (re.compile(p, re.IGNORECASE), code) for p, code in ANIMAL_CATEGORY_MAPPING.items()
]

# Feed item mapping (Russian -> DB codes from d03_feed.sql)
FEED_ITEM_MAPPING: dict[str, str] = {
    r"сено\s*(луговое|смешан)": "HAY_MIXED_GRASS",
    r"сено\s*тимофеев": "HAY_TIMOTHY",
    r"солома\s*(пшенич)?": "STRAW_WHEAT",
    r"сенаж": "HAYLAGE_GRASS",
    r"силос\s*кукуруз": "SILAGE_CORN",
    r"силос\s*подсолнеч": "SILAGE_SUNFLOWER",
    r"ячмень|арпа": "GRAIN_BARLEY",
    r"пшениц.{0,5}зерн|бидай": "GRAIN_WHEAT",
    r"кукуруз.{0,5}зерн|жүгері": "GRAIN_CORN",
    r"ов[её]с|сұлы": "GRAIN_OATS",
    r"жмых\s*подсолнеч|күнбағыс": "MEAL_SUNFLOWER",
    r"шрот\s*со[ей]в": "MEAL_SOYBEAN",
    r"мочевин|карбамид": "UREA",
    r"соль\s*(поваренн)?|тұз": "SALT_NaCl",
    r"мел\s*(кормов)?|бор": "CHALK_CaCO3",
    r"премикс": "PREMIX_BEEF",
    r"пастбищ.{0,5}весен": "PASTURE_SPRING",
    r"пастбищ.{0,5}лет|жайлау": "PASTURE_SUMMER",
}

_FEED_PATTERNS = [
    (re.compile(p, re.IGNORECASE), code) for p, code in FEED_ITEM_MAPPING.items()
]

# Full EXTRACTION_RULES (Dok 5 §7.2)
EXTRACTION_RULES = {
    "herd_group": {
        "patterns_ru": [
            r"(\d+)\s*(бычк|телк|коров|нетел|телёнок|телен)",
            r"группа.*?(\d+)\s*голов",
            r"(\d+)\s*голов.*?(бычк|коров)",
        ],
        "patterns_kk": [r"(\d+)\s*(бұзау|өгіз|сиыр|қашар)"],
        "mapping": ANIMAL_CATEGORY_MAPPING,
        "required_for_write": ["animal_category_code", "head_count"],
        "optional": ["avg_weight_kg"],
        "confirmation_required": True,
    },
    "feed_inventory": {
        "patterns_ru": [
            r"(\d+)\s*(тонн|кг|килограмм).{0,20}(сен[оа]|силос|ячмен|пшениц|солом)",
            r"(сен[оа]|силос|ячмен|пшениц|солом).{0,20}(\d+)\s*(тонн|кг)",
        ],
        "patterns_kk": [r"(\d+)\s*(тонна|кг).{0,20}(шөп|сұлы|арпа|бидай)"],
        "mapping": FEED_ITEM_MAPPING,
        "required_for_write": ["feed_item_code", "quantity_kg"],
        "optional": ["price_per_kg"],
        "confirmation_required": True,
    },
    "vet_case": {
        "patterns_ru": [r"(болен|заболел|кашля|хрома|понос|температур|не ест|вздути)"],
        "required_for_write": ["symptoms_text"],
        "optional": ["herd_group_id", "severity"],
        "confirmation_required": False,
    },
}


def extract_animal_category(text: str) -> Optional[str]:
    """Extract animal category code from Russian/Kazakh text."""
    for pattern, code in _ANIMAL_PATTERNS:
        if pattern.search(text):
            return code
    return None


def extract_feed_item(text: str) -> Optional[str]:
    """Extract feed item code from Russian/Kazakh text."""
    for pattern, code in _FEED_PATTERNS:
        if pattern.search(text):
            return code
    return None


def extract_head_count(text: str) -> Optional[int]:
    """Extract head count from text."""
    match = re.search(r"(\d+)\s*голов", text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"(\d+)\s*(бычк|телк|коров|нетел|телён|голов)", text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def extract_weight(text: str) -> Optional[float]:
    """Extract average weight in kg from text."""
    match = re.search(r"(\d+[\.,]?\d*)\s*кг", text, re.IGNORECASE)
    if match:
        return float(match.group(1).replace(",", "."))
    return None


def extract_quantity_kg(text: str) -> Optional[float]:
    """Extract feed quantity in kg, converting tonnes if needed."""
    # Try tonnes first
    match = re.search(r"(\d+[\.,]?\d*)\s*(тонн|т\b)", text, re.IGNORECASE)
    if match:
        return float(match.group(1).replace(",", ".")) * 1000
    # Then kg
    match = re.search(r"(\d+[\.,]?\d*)\s*(кг|килограмм)", text, re.IGNORECASE)
    if match:
        return float(match.group(1).replace(",", "."))
    return None


def extract_entities_from_message(text: str) -> list[dict[str, Any]]:
    """
    Dok 5 §7: Extract candidate entities from a farmer message.
    Returns list of extraction candidates. Does NOT write (P-AI-3).
    """
    extractions = []

    # Herd group extraction
    category = extract_animal_category(text)
    head_count = extract_head_count(text)
    if category and head_count:
        weight = extract_weight(text)
        extractions.append({
            "entity_type": "herd_group",
            "confidence": 0.7 + (0.2 if weight else 0),
            "raw_text": text[:200],
            "extracted": {
                "animal_category_code": category,
                "head_count": head_count,
                **({"avg_weight_kg": weight} if weight else {}),
            },
            "status": "pending_confirmation",
        })

    # Feed inventory extraction
    feed_code = extract_feed_item(text)
    if feed_code:
        quantity = extract_quantity_kg(text)
        if quantity and quantity > 0:
            extractions.append({
                "entity_type": "feed_inventory",
                "confidence": 0.7,
                "raw_text": text[:200],
                "extracted": {"feed_item_code": feed_code, "quantity_kg": quantity},
                "status": "pending_confirmation",
            })

    return extractions


def build_confirmation_payload(
    extraction: dict[str, Any], farm_id: str, organization_id: str,
) -> dict[str, Any]:
    """Build confirmation payload for ai_conversations.confirmation_payload."""
    entity_type = extraction["entity_type"]
    data = extraction["extracted"]

    if entity_type == "herd_group":
        return {
            "entity_type": "Группа скота",
            "rpc": "rpc_upsert_herd_group",
            "data": {
                "p_farm_id": farm_id,
                "p_animal_category_code": data.get("animal_category_code"),
                "p_head_count": data.get("head_count"),
                "p_avg_weight_kg": data.get("avg_weight_kg"),
                "p_data_source": "ai_extracted",
            },
        }
    elif entity_type == "feed_inventory":
        return {
            "entity_type": "Запас корма",
            "rpc": "rpc_upsert_feed_inventory",
            "data": {
                "p_farm_id": farm_id,
                "p_feed_item_code": data.get("feed_item_code"),
                "p_quantity_kg": data.get("quantity_kg"),
                "p_data_source": "ai_extracted",
            },
        }
    else:
        return {"entity_type": entity_type, "rpc": None, "data": data}
