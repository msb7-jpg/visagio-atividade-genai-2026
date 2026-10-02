from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from langchain_core.messages import AIMessage

from main import app


@pytest.mark.asyncio
async def test_chat_stream_endpoint_success():
    """Valida o endpoint POST /chat/stream transmitindo eventos SSE."""
    transport = ASGITransport(app=app)

    # Mock da resposta do modelo
    mock_router_response = AIMessage(content="sql")
    mock_generator_response = AIMessage(
        content=(
            "<thought>Filtrar os 5 maiores filmes por receita_brl</thought>\n"
            "```sql\n"
            "SELECT titulo, receita_brl FROM dim_movies m "
            "JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id "
            "WHERE f.receita_brl > 0 ORDER BY f.receita_brl DESC LIMIT 5\n"
            "```"
        )
    )
    mock_synth_response = AIMessage(content="Aqui estão os 5 maiores filmes em bilheteria...")

    with (
        patch("app.agent.graph.get_chat_model") as mock_r,
        patch("app.agent.nodes.sql_generator.get_chat_model") as mock_g,
        patch("app.agent.nodes.synthesizer.get_chat_model") as mock_s,
    ):
        mock_r_inst = AsyncMock()
        mock_r_inst.ainvoke.return_value = mock_router_response
        mock_r.return_value = mock_r_inst

        mock_g_inst = AsyncMock()
        mock_g_inst.ainvoke.return_value = mock_generator_response
        mock_g.return_value = mock_g_inst

        mock_s_inst = AsyncMock()
        mock_s_inst.ainvoke.return_value = mock_synth_response
        mock_s.return_value = mock_s_inst

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "message": "Quais os 5 maiores filmes por bilheteria?",
                "thread_id": "test-thread-123",
            }
            response = await client.post("/chat/stream", json=payload)
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")

            content = response.text
            assert "event: session" in content
            assert "event: step_end" in content
            assert "event: thought" in content
            assert "event: sql" in content
            assert "event: data" in content
            assert "event: token" in content
            assert "event: done" in content
