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
    mock_state.values = {"messages": [HumanMessage(content="Pergunta que foi interrompida")]}

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
    mock_state.values = {"messages": [HumanMessage(content="Pergunta ainda em processamento")]}

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


@pytest.mark.asyncio
async def test_thread_detail_includes_provider_and_model_metadata():
    from unittest.mock import AsyncMock, MagicMock, patch

    from langchain_core.messages import AIMessage, HumanMessage

    thread_id = "test-metadata-thread-789"
    await ThreadRepository.get_or_create_thread(thread_id, default_title="Teste Metadados")

    mock_state = MagicMock()
    mock_state.values = {
        "messages": [
            HumanMessage(content="Qual o filme mais longo?"),
            AIMessage(
                content="O filme mais longo é...",
                additional_kwargs={"provider": "groq", "model": "llama-3.3-70b-versatile"},
            ),
        ]
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
                assert len(data["messages"]) == 2
                ai_msg = data["messages"][1]
                assert ai_msg["role"] == "assistant"
                assert ai_msg["provider"] == "groq"
                assert ai_msg["model"] == "llama-3.3-70b-versatile"
    finally:
        await ThreadRepository.delete_thread(thread_id)


@pytest.mark.asyncio
async def test_thread_detail_preserves_executed_steps_on_completed_message():
    """Valida se a mensagem de assistente concluída retorna os steps persistidos (não null)."""
    from unittest.mock import AsyncMock, MagicMock, patch

    from langchain_core.messages import AIMessage, HumanMessage

    thread_id = "test-steps-completed-thread-101"
    await ThreadRepository.get_or_create_thread(thread_id, default_title="Teste Steps Concluídos")

    persisted_steps = [
        {"node": "router", "label": "Classificando intenção", "status": "done", "duration_ms": 110},
        {"node": "sql_generator", "label": "Escrevendo consulta SQL", "status": "done", "duration_ms": 950},
        {"node": "sql_executor", "label": "Executando no cinerocket.db", "status": "done", "duration_ms": 30},
        {"node": "synthesizer", "label": "Formatando análise executiva", "status": "done", "duration_ms": 1500},
    ]

    mock_state = MagicMock()
    mock_state.values = {
        "messages": [
            HumanMessage(content="Qual a média de bilheteria?"),
            AIMessage(
                content="A média é...",
                additional_kwargs={
                    "steps": persisted_steps,
                    "thought": "[Escrevendo consulta SQL]\nCalculando média...",
                },
            ),
        ]
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
                ai_msg = data["messages"][1]
                assert ai_msg["role"] == "assistant"
                assert ai_msg["steps"] is not None
                assert len(ai_msg["steps"]) == 4
                assert ai_msg["steps"][0]["step"] == "router"
                assert ai_msg["steps"][0]["label"] == "Classificando intenção"
                assert ai_msg["steps"][1]["step"] == "sql_generator"
                assert ai_msg["steps"][3]["step"] == "synthesizer"
                assert "[Escrevendo consulta SQL]" in ai_msg["thought"]
    finally:
        await ThreadRepository.delete_thread(thread_id)


@pytest.mark.asyncio
async def test_interrupted_thread_detail_preserves_prior_executed_steps():
    """Valida se uma mensagem interrompida mantém os steps prévios executados antes de abortar."""
    from unittest.mock import AsyncMock, MagicMock, patch

    from langchain_core.messages import HumanMessage

    thread_id = "test-steps-interrupted-thread-202"
    await ThreadRepository.get_or_create_thread(thread_id, default_title="Teste Steps Interrompidos")

    prior_steps = [
        {"node": "router", "label": "Classificando intenção", "status": "done", "duration_ms": 80},
        {"node": "sql_generator", "label": "Escrevendo consulta SQL", "status": "done", "duration_ms": 700},
    ]

    mock_state = MagicMock()
    mock_state.values = {
        "messages": [HumanMessage(content="Gere ranking cancelado")],
        "steps": prior_steps,
        "thought": "[Escrevendo consulta SQL]\nFiltrando por bilheteria...",
        "generated_sql": "SELECT titulo FROM dim_movies LIMIT 10",
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
                assert len(data["messages"]) == 2
                ai_msg = data["messages"][1]
                assert ai_msg["role"] == "assistant"
                assert ai_msg["steps"] is not None
                assert len(ai_msg["steps"]) == 3
                assert ai_msg["steps"][0]["step"] == "router"
                assert ai_msg["steps"][1]["step"] == "sql_generator"
                assert ai_msg["steps"][2]["step"] == "interrupted"
                assert ai_msg["steps"][2]["status"] == "error"
                assert ai_msg["generated_sql"] == "SELECT titulo FROM dim_movies LIMIT 10"
                assert "[Escrevendo consulta SQL]" in ai_msg["thought"]
    finally:
        await ThreadRepository.delete_thread(thread_id)
