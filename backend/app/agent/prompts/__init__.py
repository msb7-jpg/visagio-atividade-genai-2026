"""Módulo de prompts desacoplados do CineData Analytics."""

from app.agent.prompts.catalog_prompt import CINEDATA_CATALOG_PROMPT
from app.agent.prompts.chart_prompt import CHART_DECISION_SYSTEM_PROMPT
from app.agent.prompts.corrector_prompt import CORRECTOR_PROMPT
from app.agent.prompts.data_analysis_prompt import STATISTICAL_ANALYSIS_PROMPT
from app.agent.prompts.router_prompt import ROUTER_PROMPT
from app.agent.prompts.synthesizer_prompt import (
    CHART_PRESENT_PROMPT,
    SYNTHESIZER_PROMPT,
    TABLE_PRESENT_PROMPT,
)
from app.agent.prompts.title_prompt import TITLE_GENERATION_PROMPT
from app.agent.prompts.toon_serializer import serialize_to_toon_tabular

__all__ = [
    "CHART_DECISION_SYSTEM_PROMPT",
    "CHART_PRESENT_PROMPT",
    "CINEDATA_CATALOG_PROMPT",
    "CORRECTOR_PROMPT",
    "ROUTER_PROMPT",
    "STATISTICAL_ANALYSIS_PROMPT",
    "SYNTHESIZER_PROMPT",
    "TABLE_PRESENT_PROMPT",
    "TITLE_GENERATION_PROMPT",
    "serialize_to_toon_tabular",
]
