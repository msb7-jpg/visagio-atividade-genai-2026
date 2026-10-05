"""Testes unitários para validação de prompts centralizados e salvaguardas do sintetizador."""

from app.agent.nodes.synthesizer import _check_movie_ids_integrity
from app.agent.prompts import (
    CHART_DECISION_SYSTEM_PROMPT,
    CHART_PRESENT_PROMPT,
    CINEDATA_CATALOG_PROMPT,
    CORRECTOR_PROMPT,
    ROUTER_PROMPT,
    STATISTICAL_ANALYSIS_PROMPT,
    SYNTHESIZER_PROMPT,
    TABLE_PRESENT_PROMPT,
    TITLE_GENERATION_PROMPT,
)


def test_prompts_are_exported_and_contain_anti_hallucination_directives():
    """Valida que todos os prompts essenciais estão centralizados e contêm as diretrizes de governança."""
    assert "CINEDATA_CATALOG_PROMPT" in globals()
    assert "PROJEÇÃO OBRIGATÓRIA DE FILMES COM JOIN" in CINEDATA_CATALOG_PROMPT
    assert "m.titulo" in CINEDATA_CATALOG_PROMPT
    assert "m.sk_movie_id" in CINEDATA_CATALOG_PROMPT
    assert "fact_movies_performance" in CINEDATA_CATALOG_PROMPT

    assert "CORRECTOR_PROMPT" in globals()
    assert "JOIN com dim_movies" in CORRECTOR_PROMPT

    assert "CHART_DECISION_SYSTEM_PROMPT" in globals()
    assert "REGRAS CRÍTICAS DE RÓTULOS (LABELS)" in CHART_DECISION_SYSTEM_PROMPT
    assert "TERMINANTEMENTE PROIBIDO inventar rótulos genéricos" in CHART_DECISION_SYSTEM_PROMPT

    assert "SYNTHESIZER_PROMPT" in globals()
    assert "ZERO VAZAMENTO TÉCNICO" in SYNTHESIZER_PROMPT
    assert "cards cinematográficos interativos" not in SYNTHESIZER_PROMPT.lower()
    assert "FIDELIDADE ABSOLUTA AOS DADOS (ANTI-ALUCINAÇÃO)" in SYNTHESIZER_PROMPT

    assert len(ROUTER_PROMPT) > 50
    assert len(STATISTICAL_ANALYSIS_PROMPT) > 50
    assert len(TITLE_GENERATION_PROMPT) > 50
    assert len(CHART_PRESENT_PROMPT) > 50
    assert len(TABLE_PRESENT_PROMPT) > 50


def test_check_movie_ids_integrity_with_valid_titles_and_ids():
    """Valida que dados contendo títulos e IDs passam sem disparar aviso de integridade."""
    sample_records = [
        {"sk_movie_id": "id-123", "titulo": "Avatar: The Way of Water", "receita_brl": 1000},
        {"sk_movie_id": "id-456", "titulo": "Avengers: Endgame", "receita_brl": 2000},
    ]
    warning_message = _check_movie_ids_integrity(sample_records)
    assert warning_message == ""


def test_check_movie_ids_integrity_with_ids_only_returns_integrity_warning():
    """Valida que dados contendo apenas IDs técnicos sem títulos disparam o aviso de integridade."""
    sample_records = [
        {"sk_movie_id": "id-123", "receita_brl": 1000},
        {"sk_movie_id": "id-456", "receita_brl": 2000},
    ]
    warning_message = _check_movie_ids_integrity(sample_records)
    assert "AVISO DE INTEGRIDADE" in warning_message
    assert "NUNCA invente títulos fictícios" in warning_message


def test_check_movie_ids_integrity_empty_records():
    """Valida que registros vazios ou sem IDs retornam string vazia."""
    assert _check_movie_ids_integrity([]) == ""
    assert _check_movie_ids_integrity([{"coluna_qualquer": 1}]) == ""
