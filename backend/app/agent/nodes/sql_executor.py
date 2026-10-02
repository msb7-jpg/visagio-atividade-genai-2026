from typing import Any

from app.agent.nodes.sql_validator import validate_sql_query
from app.agent.state import AgentState
from app.agent.tools.query_runner import execute_sql_query
from app.shared.exceptions import DatabaseReadError


def sql_executor_node(state: AgentState) -> dict[str, Any]:
    """
    Executa a consulta SQL gerada após validação AST.
    Em caso de falha de validação ou de execução SQLite, registra o erro para o nó de correção.
    """
    sql = state.get("generated_sql")
    if not sql:
        existing_error = state.get("last_error")
        existing_cat = state.get("error_category") or "UNSUPPORTED_REQUEST"
        return {
            "query_result": None,
            "last_error": existing_error or "Nenhum código SQL foi gerado para execução.",
            "error_category": existing_cat,
            "error_count": state.get("error_count", 0) + 1,
        }

    is_valid, validation_error, error_cat = validate_sql_query(sql)
    if not is_valid:
        return {
            "query_result": None,
            "last_error": f"Falha na validação AST: {validation_error}",
            "error_category": error_cat or "SECURITY_VIOLATION",
            "error_count": state.get("error_count", 0) + 1,
        }

    try:
        results = execute_sql_query.invoke({"query": sql})
        return {
            "query_result": results,
            "last_error": None,
            "error_category": None,
        }
    except (DatabaseReadError, ValueError, Exception) as exc:
        return {
            "query_result": None,
            "last_error": f"Erro de execução SQL: {exc}",
            "error_category": "RECOVERABLE_SYNTAX",
            "error_count": state.get("error_count", 0) + 1,
        }
