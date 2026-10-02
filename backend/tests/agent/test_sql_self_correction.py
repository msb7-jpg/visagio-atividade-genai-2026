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
