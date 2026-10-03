import pytest
from httpx import ASGITransport, AsyncClient

from app.features.chat.thread_repository import ThreadRepository
from main import app


@pytest.mark.asyncio
async def test_threads_api_crud_flow():
    thread_id = "test-api-thread-xyz"
    await ThreadRepository.get_or_create_thread(thread_id, default_title="Teste Inicial")
    await ThreadRepository.update_thread_title(thread_id, "Conversa de Teste API")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Listar threads
        res_list = await client.get("/chat/threads")
        assert res_list.status_code == 200
        threads = res_list.json()
        assert any(t["thread_id"] == thread_id for t in threads)

        # 2. Obter thread específica
        res_get = await client.get(f"/chat/threads/{thread_id}")
        assert res_get.status_code == 200
        detail = res_get.json()
        assert detail["thread_id"] == thread_id
        assert detail["title"] == "Conversa de Teste API"

        # 3. Excluir thread
        res_del = await client.delete(f"/chat/threads/{thread_id}")
        assert res_del.status_code == 200
        assert res_del.json()["success"] is True

        # 4. Verificar se 404 após exclusão
        res_get_after = await client.get(f"/chat/threads/{thread_id}")
        assert res_get_after.status_code == 404


@pytest.mark.asyncio
async def test_interrupted_thread_detail_synthesizes_error_step():
    from unittest.mock import AsyncMock, MagicMock, patch

    from langchain_core.messages import HumanMessage

    thread_id = "test-interrupted-thread-123"
    await ThreadRepository.get_or_create_thread(thread_id, default_title="Teste Interrupção")

    mock_state = MagicMock()
    mock_state.values = {
        "messages": [HumanMessage(content="Pergunta que foi interrompida")]
    }

    with patch("app.features.chat.threads_service.create_agent_graph") as mock_graph:
        graph_inst = MagicMock()
        graph_inst.aget_state = AsyncMock(return_value=mock_state)
        mock_graph.return_value = graph_inst

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/chat/threads/{thread_id}")
            assert res.status_code == 200
            data = res.json()
            assert len(data["messages"]) == 2
            assert data["messages"][0]["role"] == "user"
            assert data["messages"][1]["role"] == "assistant"
            assert data["messages"][1]["steps"][0]["status"] == "error"
            assert data["messages"][1]["steps"][0]["label"] == "Processamento interrompido"

    await ThreadRepository.delete_thread(thread_id)

@pytest.mark.asyncio
async def test_running_thread_detail_does_not_synthesize_error_step():
    from unittest.mock import AsyncMock, MagicMock, patch

    from langchain_core.messages import HumanMessage

    from app.core.session_manager import get_session_manager

    thread_id = "test-running-thread-456"
    await ThreadRepository.get_or_create_thread(thread_id, default_title="Teste Em Andamento")
    session_manager = get_session_manager()
    await session_manager.register_session(thread_id)

    mock_state = MagicMock()
    mock_state.values = {
        "messages": [HumanMessage(content="Pergunta ainda em processamento")]
    }

    try:
        with patch("app.features.chat.threads_service.create_agent_graph") as mock_graph:
            graph_inst = MagicMock()
            graph_inst.aget_state = AsyncMock(return_value=mock_state)
            mock_graph.return_value = graph_inst

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get(f"/chat/threads/{thread_id}")
                assert res.status_code == 200
                data = res.json()
                assert data["is_running"] is True
                assert len(data["messages"]) == 1
                assert data["messages"][0]["role"] == "user"
    finally:
        await session_manager.unregister_session(thread_id)
        await ThreadRepository.delete_thread(thread_id)
