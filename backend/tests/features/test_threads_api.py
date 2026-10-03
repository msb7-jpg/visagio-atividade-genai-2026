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
