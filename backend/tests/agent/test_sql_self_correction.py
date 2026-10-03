from unittest.mock import AsyncMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.agent.nodes.corrector import sql_corrector_node
from app.agent.nodes.sql_executor import sql_executor_node
from app.agent.state import AgentState


@pytest.mark.asyncio
async def test_sql_corrector_loop_flow():
    """Simula a recuperação de uma query com erro de sintaxe via sql_corrector_node."""
    state: AgentState = {
        "messages": [HumanMessage(content="Qual o filme mais lucrativo?")],
        "route": "sql",
        "thought": None,
        "generated_sql": "SELECT non_existent_col FROM dim_movies",
        "query_result": None,
        "error_count": 0,
        "last_error": None,
        "title": None,
        "steps": [],
    }

    # 1. sql_executor_node falha na primeira execução
    exec_result = sql_executor_node(state)
    assert exec_result["query_result"] is None
    assert exec_result["last_error"] is not None
    assert exec_result["error_count"] == 1

    # Atualiza estado simulando o nó do grafo
    state.update(exec_result)

    # 2. Mock do modelo no nó corretor fornecendo SQL corrigido
    corrected_ai_response = AIMessage(
        content=(
            "<thought>Ajustando para selecionar titulo e lucro_brl</thought>\n"
            "```sql\n"
            "SELECT m.titulo, f.lucro_brl FROM dim_movies m "
            "JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id "
            "ORDER BY f.lucro_brl DESC LIMIT 1\n"
            "```"
        )
    )

    with patch("app.agent.nodes.corrector.get_chat_model") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = corrected_ai_response
        mock_get_llm.return_value = mock_llm

        corrector_result = await sql_corrector_node(state)
        assert corrector_result["generated_sql"] is not None
        assert "lucro_brl" in corrector_result["generated_sql"]
        assert corrector_result["thought"] is not None

        # 3. Execução do SQL corrigido
        state.update(corrector_result)
        final_exec = sql_executor_node(state)
        assert final_exec["last_error"] is None
        assert isinstance(final_exec["query_result"], list)
        assert len(final_exec["query_result"]) == 1


def test_check_sql_execution_security_bypass():
    """Verifica se erros de violação de segurança/comandos proibidos pulam o corretor e vão para o sintetizador."""
    from app.agent.graph import check_sql_execution

    # Caso de erro de segurança / comando proibido tipado via error_category
    state_security: AgentState = {
        "messages": [HumanMessage(content="Limpar todas as tabelas")],
        "route": "sql",
        "thought": None,
        "generated_sql": None,
        "query_result": None,
        "error_count": 1,
        "last_error": (
            "Operação não permitida por política de segurança: "
            "O banco CineData opera estritamente em modo de leitura (Read-Only)."
        ),
        "error_category": "SECURITY_VIOLATION",
        "title": None,
        "steps": [],
    }
    assert check_sql_execution(state_security) == "synthesizer"

    # Caso de AST proibindo DROP via error_category
    state_ast_drop: AgentState = {
        "messages": [HumanMessage(content="Drop table dim_movies")],
        "route": "sql",
        "thought": None,
        "generated_sql": "DROP TABLE dim_movies",
        "query_result": None,
        "error_count": 1,
        "last_error": "Falha na validação AST: Comando proibido detectado na consulta: DROP",
        "error_category": "SECURITY_VIOLATION",
        "title": None,
        "steps": [],
    }
    assert check_sql_execution(state_ast_drop) == "synthesizer"

    # Caso de erro recuperável comum (ex: coluna errada)
    state_recoverable: AgentState = {
        "messages": [HumanMessage(content="Qual o filme?")],
        "route": "sql",
        "thought": None,
        "generated_sql": "SELECT foo FROM dim_movies",
        "query_result": None,
        "error_count": 1,
        "last_error": "Erro de execução SQL: no such column: foo",
        "error_category": "RECOVERABLE_SYNTAX",
        "title": None,
        "steps": [],
    }
    assert check_sql_execution(state_recoverable) == "sql_corrector"
