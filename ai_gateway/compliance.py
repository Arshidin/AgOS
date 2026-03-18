"""
AgOS AI Gateway — Compliance Filter

P-AI-4: No numeric dosages from LLM — only from DB (vet_products/treatments).
P-AI-5: Every response passes through this filter before sending.

Dok 5 §8: COMPLIANCE_RULES.
"""
import re
import logging
from typing import Optional

logger = logging.getLogger("agos.gateway.compliance")

# --------------------------------------------------------------------------
# Dosage patterns (P-AI-4 / CF-02)
# Catches: "5 мг/кг", "10 мл", "2.5 г/кг", "0.5 mg/kg", "доза: 10"
# --------------------------------------------------------------------------
DOSAGE_PATTERNS = [
    # Russian units
    r"\d+[.,]?\d*\s*мг/кг",
    r"\d+[.,]?\d*\s*мл/кг",
    r"\d+[.,]?\d*\s*мг(?!\w)",     # мг not followed by word char (not мгновенно)
    r"\d+[.,]?\d*\s*мл(?!\w)",
    r"\d+[.,]?\d*\s*г/кг",
    r"\d+[.,]?\d*\s*см[³³]",
    r"\d+[.,]?\d*\s*ед[./]",       # единиц
    # English units
    r"\d+[.,]?\d*\s*mg/kg",
    r"\d+[.,]?\d*\s*ml/kg",
    r"\d+[.,]?\d*\s*mg(?!\w)",
    r"\d+[.,]?\d*\s*ml(?!\w)",
    r"\d+[.,]?\d*\s*IU/kg",
    # "доза/дозировка: <number>"
    r"(?:доз[аировк]{1,6})\s*[:=]\s*\d+",
    r"(?:dose|dosage)\s*[:=]\s*\d+",
    # "вводить X мл" / "по X мг"
    r"(?:вводить|ввести|колоть|дать|давать|по)\s+\d+[.,]?\d*\s*(?:мг|мл|г|ед)",
]

_DOSAGE_RE = re.compile("|".join(DOSAGE_PATTERNS), re.IGNORECASE)

DOSAGE_REPLACEMENT = "Дозировку определяет ветеринарный врач."

# --------------------------------------------------------------------------
# Antitrust patterns (CF-01 / Article 171)
# --------------------------------------------------------------------------
ANTITRUST_TRIGGERS_RU = [
    "цена другого фермера",
    "договоримся о цене",
    "не продавайте ниже",
    "минимальная цена для всех",
    "держите цену",
    "согласуем цену",
]
ANTITRUST_TRIGGERS_KK = [
    "басқа фермер бағасы",
    "бағаға келісейік",
]

ANTITRUST_REPLACEMENT = (
    "Я не могу обсуждать цены других участников рынка. "
    "Ориентируйтесь на справочную сетку цен ТУРАН."
)

# --------------------------------------------------------------------------
# Price disclaimer (appended when price data was shown)
# --------------------------------------------------------------------------
PRICE_DISCLAIMER = (
    "\n\n*Справочные цены являются индикативными ориентирами. "
    "ТУРАН не устанавливает и не гарантирует цены сделок.*"
)

# --------------------------------------------------------------------------
# Legal advice prohibition (CF-05)
# --------------------------------------------------------------------------
LEGAL_TRIGGERS = [
    "юридически обязан",
    "суд решит",
    "закон однозначно",
]
LEGAL_APPEND = "\n\n*Это информационная справка, не юридическое заключение.*"


def check_dosage_compliance(text: str) -> tuple[bool, str]:
    """
    P-AI-4: Check that AI response contains NO numeric dosage patterns.

    Returns:
        (is_clean, filtered_text)
        is_clean=True means no violations found; filtered_text == original.
        is_clean=False means violations were replaced.
    """
    if not text:
        return True, text

    match = _DOSAGE_RE.search(text)
    if not match:
        return True, text

    # Log the violation for monitoring
    logger.warning(
        "P-AI-4 VIOLATION detected: dosage pattern in AI response: %s",
        match.group()[:100],
    )

    # Replace all dosage patterns with safe message
    filtered = _DOSAGE_RE.sub(DOSAGE_REPLACEMENT, text)
    return False, filtered


def check_antitrust_compliance(text: str) -> tuple[bool, str]:
    """
    CF-01: Check for antitrust / price coordination language.
    """
    if not text:
        return True, text

    text_lower = text.lower()
    for trigger in ANTITRUST_TRIGGERS_RU + ANTITRUST_TRIGGERS_KK:
        if trigger in text_lower:
            logger.warning("CF-01 VIOLATION: antitrust trigger '%s'", trigger)
            return False, ANTITRUST_REPLACEMENT

    return True, text


def check_legal_advice(text: str) -> tuple[bool, str]:
    """
    CF-05: Append disclaimer when legal-sounding language detected.
    """
    if not text:
        return True, text

    text_lower = text.lower()
    for trigger in LEGAL_TRIGGERS:
        if trigger in text_lower:
            logger.info("CF-05: legal advice trigger '%s' — appending disclaimer", trigger)
            return False, text + LEGAL_APPEND

    return True, text


def run_compliance_filter(
    response_text: str,
    tool_calls_made: Optional[list[str]] = None,
) -> tuple[bool, str]:
    """
    Run ALL compliance checks on AI response.

    Args:
        response_text: The AI-generated response text.
        tool_calls_made: List of tool names called during this run
                         (to detect if price data was shown).

    Returns:
        (all_clean, filtered_text)
        all_clean=True means no violations found.
    """
    if not response_text:
        return True, response_text

    all_clean = True
    text = response_text

    # CF-01: Antitrust
    clean, text = check_antitrust_compliance(text)
    if not clean:
        all_clean = False

    # CF-02 / P-AI-4: Dosage hallucination
    clean, text = check_dosage_compliance(text)
    if not clean:
        all_clean = False

    # CF-05: Legal advice
    clean, text = check_legal_advice(text)
    if not clean:
        all_clean = False

    # Price disclaimer (when price tools were used)
    if tool_calls_made:
        price_tools = {"get_price_grid", "get_market_overview", "get_active_batches"}
        if price_tools & set(tool_calls_made):
            text = text + PRICE_DISCLAIMER

    return all_clean, text
