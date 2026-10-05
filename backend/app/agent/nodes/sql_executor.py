import logging

from app.agent.nodes.sql_validator import validate_sql_query
from app.agent.state import AgentState, AgentStateUpdate
from app.agent.tools.query_runner import execute_sql_query
from app.core.constants import SqlErrorCategory
from app.shared.exceptions import DatabaseReadError

logger = logging.getLogger(__name__)


def sql_executor_node(state: AgentState) -> AgentStateUpdate:
    """
    Executa a consulta SQL gerada após validação sintática e de segurança na AST.

    Em caso de falha de validação ou de execução SQLite, registra a mensagem de erro
    e sua categoria para direcionamento posterior no grafo.

    Args:
        state: Estado atual contendo 'generated_sql' e histórico de erros.

    Returns:
        Atualização parcial do estado contendo query_result ou last_error / error_category.
    """
    sql = state.get("generated_sql")
    if not sql:
        existing_error = state.get("last_error")
        existing_cat = state.get("error_category") or SqlErrorCategory.UNSUPPORTED_REQUEST
        logger.info("Execução de SQL ignorada: nenhum código SQL foi gerado (motivo: '%s')", existing_error)
        return {
            "query_result": None,
            "last_error": existing_error or "Nenhum código SQL foi gerado para execução.",
            "error_category": existing_cat,
            "error_count": state.get("error_count", 0) + 1,
        }

    is_valid, validation_error, error_cat = validate_sql_query(sql)
    if not is_valid:
        logger.warning("Falha na validação AST da query SQL: %s | SQL: %s", validation_error, sql)
        return {
            "query_result": None,
            "last_error": f"Falha na validação AST: {validation_error}",
            "error_category": error_cat or SqlErrorCategory.SECURITY_VIOLATION,
            "error_count": state.get("error_count", 0) + 1,
        }

    try:
        results = execute_sql_query.invoke({"query": sql})
        logger.info("Query SQL executada com sucesso (%d linhas retornadas).", len(results))
        return {
            "query_result": results,
            "last_error": None,
            "error_category": None,
        }
    except (DatabaseReadError, ValueError, Exception) as exc:
        logger.error("Erro na execução SQLite: %s | SQL: %s", exc, sql)
        return {
            "query_result": None,
            "last_error": f"Erro de execução SQL: {exc}",
            "error_category": SqlErrorCategory.RECOVERABLE_SYNTAX,
            "error_count": state.get("error_count", 0) + 1,
        }
