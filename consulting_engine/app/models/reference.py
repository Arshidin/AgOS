"""Reference data types for consulting engine."""

from pydantic import BaseModel


class ReferenceItem(BaseModel):
    """Один элемент справочника."""

    category: str
    code: str
    data: dict


class FeedNorm(BaseModel):
    """Кормовая норма — суточный рацион для группы."""

    group: str
    feed_type: str
    daily_kg: float
    season: str  # pasture | stall


class InfrastructureNorm(BaseModel):
    """Норматив инфраструктуры — FAC/PAD/MAT коды."""

    code: str
    name_ru: str
    norm_m2_per_head: float
    price_per_m2: float
    depends_on_calving: bool = False
