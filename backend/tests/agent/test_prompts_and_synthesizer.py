"""Testes unitários para validação de prompts centralizados e salvaguardas do sintetizador."""

from app.agent.nodes.synthesizer import _check_movie_ids_integrity, _enrich_movie_annotations
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


def test_synthesizer_prompt_contains_narrative_elegance_directives():
    """Valida que o prompt do sintetizador contém a proibição de tuplas literais e a regra de elegância."""
    assert "ELEGÂNCIA NARRATIVA NA CITAÇÃO DE FILMES" in SYNTHESIZER_PROMPT
    assert "É ESTRITAMENTE PROIBIDO usar formatação de tuplas" in SYNTHESIZER_PROMPT
    assert "texto narrativo da análise" in SYNTHESIZER_PROMPT


def test_synthesizer_prompt_contains_financial_rigor_directives():
    """Valida que o prompt do sintetizador contém a diretriz de rigor conceitual de margem e retorno."""
    assert "RIGOR CONCEITUAL EM FINANÇAS" in SYNTHESIZER_PROMPT
    assert "CUSTO/ORÇAMENTO FOI MÍNIMO" in SYNTHESIZER_PROMPT
    assert "NUNCA confunda margem de 100% com receita igual ao orçamento" in SYNTHESIZER_PROMPT


def test_enrich_movie_annotations_converts_quoted_titles_to_markdown_links():
    """Valida que títulos citados entre aspas na narrativa são convertidos em links com sk_movie_id."""
    sample_records = [
        {"titulo": "Avatar: The Way Of Water", "sk_movie_id": "avatar-hash-123"},
        {"titulo": "Barbie", "sk_movie_id": "barbie-hash-456"},
    ]
    raw_content = (
        'Destaque para "Avatar: The Way Of Water" e também ("Barbie"). '
        "Já [Avatar: The Way Of Water](movie:avatar-hash-123) não deve ser duplicado."
    )

    enriched = _enrich_movie_annotations(raw_content, sample_records)

    assert "[Avatar: The Way Of Water](movie:avatar-hash-123)" in enriched
    assert '("Barbie")' not in enriched
    assert "([Barbie](movie:barbie-hash-456))" in enriched
    assert "[[Avatar" not in enriched


def test_enrich_movie_annotations_noop_when_empty_or_no_records():
    """Valida que conteúdo vazio ou sem registros correspondentes permanece inalterado."""
    assert _enrich_movie_annotations("", []) == ""
    assert _enrich_movie_annotations("Texto puro sem filmes", []) == "Texto puro sem filmes"
    assert _enrich_movie_annotations("Texto", None) == "Texto"
