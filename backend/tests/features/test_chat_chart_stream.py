import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_chat_stream_emits_chart_event():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock do LangGraph astream para simular execução completa com chart_spec
        mock_events = [
            {"router": {"route": "sql"}},
            {
                "sql_generator": {
                    "generated_sql": "SELECT nome_produtora, SUM(lucro_brl) FROM dim_companies GROUP BY 1 LIMIT 3",
                    "thought": "Calculando lucro das produtoras",
                }
            },
            {
                "sql_executor": {
                    "query_result": [
                        {"nome_produtora": "Warner", "lucro_brl": 500000000.0},
                        {"nome_produtora": "Disney", "lucro_brl": 450000000.0},
                    ]
                }
            },
            {
                "chart_generator": {
                    "chart_spec": {
                        "type": "bar",
                        "title": "Produtoras Mais Lucrativas",
                        "labels": ["Warner", "Disney"],
                        "datasets": [
                            {
                                "label": "Lucro (R$)",
                                "data": [500000000.0, 450000000.0],
                            }
                        ],
                    }
                }
            },
            {
                "synthesizer": {
                    "messages": [
                        AsyncMock(content="Aqui está o gráfico das produtoras mais lucrativas.")
                    ]
                }
            },
        ]

        async def fake_astream(*args, **kwargs):
            for ev in mock_events:
                yield ev

        with patch("app.features.chat.service.create_agent_graph") as mock_graph_factory:
            mock_graph = AsyncMock()
            mock_graph.astream = fake_astream
            mock_graph_factory.return_value = mock_graph

            payload = {
                "message": "Gere um gráfico de barras com as 5 produtoras mais lucrativas do catálogo.",
                "provider": "local",
                "model": "qwen2.5-coder-7b",
            }

            response = await client.post("/chat/stream", json=payload)
            assert response.status_code == 200

            content = response.text
            assert "event: chart" in content
            assert "event: data" in content
            assert "Produtoras Mais Lucrativas" in content
            assert "event: done" in content
