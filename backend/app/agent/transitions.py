"""Funções de decisão e transição para as arestas condicionais do grafo do agente."""

import logging

from app.agent.nodes.data_analysis import should_run_data_analysis
from app.agent.state import AgentState
from app.core.constants import AgentNode, SqlErrorCategory

logger = logging.getLogger(__name__)


def route_decision(state: AgentState) -> str:
    """
    Decide para qual nó direcionar a execução após a classificação inicial do roteador.

    Args:
        state: Estado atual contendo a chave 'route'.

    Returns:
        Identificador do próximo nó: 'semantic_search', 'sql_generator' ou 'synthesizer'.
    """
    route = state.get("route", "sql")
    logger.info("Transição [route_decision]: rota='%s'", route)
    if route == "direct":
        return AgentNode.SYNTHESIZER.value
    if route in ("rag", "hybrid"):
        return AgentNode.SEMANTIC_SEARCH.value
    return AgentNode.SQL_GENERATOR.value


def semantic_decision(state: AgentState) -> str:
    """
    Decide para onde convergir após a busca semântica vetorial (RAG puro ou Híbrido RAG+SQL).

    Args:
        state: Estado atual com 'route' e 'semantic_results'.

    Returns:
        'sql_generator' se for híbrido, ou 'synthesizer' se for RAG puramente qualitativo.
    """
    route = state.get("route")
    results_count = len(state.get("semantic_results") or [])
    logger.info("Transição [semantic_decision]: rota='%s', candidatos_encontrados=%d", route, results_count)
    if route == "hybrid":
        return AgentNode.SQL_GENERATOR.value
    return AgentNode.SYNTHESIZER.value


def check_sql_execution(state: AgentState) -> str:
    """
    Decide o próximo nó após a execução SQL (sucesso para análise/gráfico ou loop de autocorreção).

    Args:
        state: Estado contendo query_result, last_error e error_count.

    Returns:
        Identificador do nó de destino: 'sql_corrector', 'data_analysis', 'chart_generator' ou 'synthesizer'.
    """
    last_error = state.get("last_error")
    error_count = state.get("error_count", 0)
    error_cat = state.get("error_category")
    rows_count = len(state.get("query_result") or [])

    if not last_error:
        # Sucesso na execução SQL
        if should_run_data_analysis(state):
            logger.info(
                "Transição [check_sql_execution]: Sucesso SQL (%d linhas). Desviando para data_analysis.",
                rows_count,
            )
            return AgentNode.DATA_ANALYSIS.value
        if state.get("query_result"):
            logger.info(
                "Transição [check_sql_execution]: Sucesso SQL (%d linhas). Desviando para chart_generator.",
                rows_count,
            )
            return AgentNode.CHART_GENERATOR.value
        logger.info("Transição [check_sql_execution]: Sucesso SQL sem resultados. Desviando para synthesizer.")
        return AgentNode.SYNTHESIZER.value

    # Recusas de segurança ou solicitações não suportadas vão direto para o sintetizador
    if error_cat in (
        SqlErrorCategory.SECURITY_VIOLATION.value,
        SqlErrorCategory.UNSUPPORTED_REQUEST.value,
    ):
        logger.warning(
            "Transição [check_sql_execution]: Erro sem recuperação (categoria='%s'). Desviando para synthesizer.",
            error_cat,
        )
        return AgentNode.SYNTHESIZER.value

    error_lower = last_error.lower()
    is_security_or_forbidden = (
        "política de segurança" in error_lower
        or "comando proibido" in error_lower
        or "acesso proibido" in error_lower
        or "declaração não autorizada" in error_lower
        or "tipo de instrução não permitida" in error_lower
        or "não foi possível gerar consulta sql para este pedido" in error_lower
    )
    if is_security_or_forbidden:
        logger.warning(
            "Transição [check_sql_execution]: Restrição de segurança/escopo detectada. Desviando para synthesizer."
        )
        return AgentNode.SYNTHESIZER.value

    if error_count < 3:
        logger.warning(
            "Transição [check_sql_execution]: Falha sintática (tentativa %d/3). Desviando para sql_corrector: %s",
            error_count,
            last_error,
        )
        return AgentNode.SQL_CORRECTOR.value

    logger.error(
        "Transição [check_sql_execution]: Limite de 3 tentativas de autocorreção excedido. Desviando para synthesizer."
    )
    return AgentNode.SYNTHESIZER.value
