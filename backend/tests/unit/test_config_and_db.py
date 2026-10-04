import sqlite3

import pytest
from langchain_core.messages import HumanMessage

from app.agent.graph import create_agent_graph
from app.core.config import Settings
from app.db.session import get_db_path, get_readonly_db_connection


def test_settings_load_and_db_exists(test_settings: Settings):
    """Verifica que as configurações carregam com sucesso e o arquivo cinerocket.db existe."""
    assert test_settings.app_name == "CineData Analytics API"
    db_path = get_db_path()
    assert db_path.exists()
    assert db_path.name == "cinerocket.db"


def test_db_readonly_allows_select():
    """Garante que a conexão read-only permite queries SELECT com sucesso."""
    with get_readonly_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) as total FROM dim_movies")
        row = cursor.fetchone()
        assert row is not None
        assert row["total"] > 0


def test_db_readonly_blocks_insert_and_write_operations():
    """
    Verifica que o SQLite rejeita estritamente comandos de escrita
    devido ao modo URI 'mode=ro'.
    """
    with get_readonly_db_connection() as conn:
        cursor = conn.cursor()
        with pytest.raises(sqlite3.OperationalError, match="readonly"):
            cursor.execute("INSERT INTO dim_movies (id_filme, titulo) VALUES (999999, 'Test Movie')")

        with pytest.raises(sqlite3.OperationalError, match="readonly"):
            cursor.execute("CREATE TABLE test_table (id INTEGER PRIMARY KEY)")

        with pytest.raises(sqlite3.OperationalError, match="readonly"):
            cursor.execute("DELETE FROM dim_movies WHERE id_filme = 1")


@pytest.mark.asyncio
async def test_agent_graph_compiles_and_invokes():
    """Verifica que o StateGraph do agente compila e executa o fluxo com ainvoke."""
    from unittest.mock import AsyncMock, patch

    from langchain_core.messages import AIMessage

    graph = create_agent_graph()
    initial_state = {
        "messages": [HumanMessage(content="Qual o filme mais rentável?")],
        "route": None,
        "thought": None,
        "generated_sql": None,
        "query_result": None,
        "error_count": 0,
        "last_error": None,
        "title": None,
        "steps": [],
    }
    with (
        patch("app.agent.nodes.router_node.get_chat_model") as mock_r,
        patch("app.agent.nodes.sql_generator.get_chat_model") as mock_g,
        patch("app.agent.nodes.synthesizer.get_chat_model") as mock_s,
    ):
        mock_r.return_value = AsyncMock(ainvoke=AsyncMock(return_value=AIMessage(content="sql")))
        mock_msg = "<thought>teste</thought>```sql\nSELECT titulo FROM dim_movies LIMIT 1\n```"
        mock_g.return_value = AsyncMock(ainvoke=AsyncMock(return_value=AIMessage(content=mock_msg)))
        mock_s.return_value = AsyncMock(ainvoke=AsyncMock(return_value=AIMessage(content="Resposta final")))

        result = await graph.ainvoke(initial_state)
        assert result["route"] == "sql"
        assert result["generated_sql"] is not None
        assert len(result["messages"]) >= 2
        assert len(result["steps"]) >= 3
        step_nodes = [s["node"] for s in result["steps"]]
        assert "router" in step_nodes
        assert "sql_generator" in step_nodes
        assert "synthesizer" in step_nodes
        assert "[Escrevendo consulta SQL]" in str(result["thought"])
        assert len(result["messages"][-1].additional_kwargs.get("steps", [])) >= 3
