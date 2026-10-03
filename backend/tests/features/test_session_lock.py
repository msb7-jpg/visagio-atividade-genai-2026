import asyncio
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.session_manager import get_session_manager
from app.features.chat.error_handler import StreamErrorHandler
from app.features.chat.schemas import ChatStreamRequestDTO
from app.features.chat.service import AgentChatService
from main import app


@pytest.mark.asyncio
async def test_session_manager_register_and_unregister():
    mgr = get_session_manager()
    await mgr.clear_all()

    assert not await mgr.has_active_sessions()

    await mgr.register_session("sess-1")
    assert await mgr.has_active_sessions()
    assert "sess-1" in await mgr.get_active_sessions()

    await mgr.unregister_session("sess-1")
    assert not await mgr.has_active_sessions()


@pytest.mark.asyncio
async def test_settings_provider_blocked_when_session_active():
    mgr = get_session_manager()
    await mgr.clear_all()
    await mgr.register_session("test-active-stream")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "provider": "google",
            "model": "gemini-2.5-flash",
            "api_key": "dummy-key",
            "timeout_seconds": 30,
        }
        response = await client.post("/settings/provider", json=payload)
        assert response.status_code == 409
        detail = response.json().get("detail", "")
        assert "sessão analítica em andamento" in detail

    # Cleanup
    await mgr.clear_all()


def test_format_stream_error_categorization():
    err_402 = Exception(
        "Error calling model 'gemini-2.5-flash' (RESOURCE_EXHAUSTED): 402 RESOURCE_EXHAUSTED. "
        "{'error': {'code': 402, 'message': 'Your prepayment credits are depleted.'}}"
    )
    formatted_402 = StreamErrorHandler.format_error(err_402, active_provider="google")
    assert formatted_402["error_code"] == "RESOURCE_EXHAUSTED"
    assert "esgotados" in formatted_402["message"].lower()

    err_401 = Exception("401 Unauthorized: Invalid API key provided.")
    formatted_401 = StreamErrorHandler.format_error(err_401, active_provider="groq")
    assert formatted_401["error_code"] == "UNAUTHORIZED"
    assert "inválida" in formatted_401["message"].lower()

    err_conn = ConnectionRefusedError("Connection refused by localhost:1234")
    formatted_conn = StreamErrorHandler.format_error(err_conn, active_provider="local")
    assert formatted_conn["error_code"] == "CONNECTION_REFUSED"

    err_timeout = TimeoutError("Request timed out after 30s")
    formatted_timeout = StreamErrorHandler.format_error(err_timeout, active_provider="openrouter")
    assert formatted_timeout["error_code"] == "TIMEOUT"


@pytest.mark.asyncio
async def test_stream_chat_cleans_up_session_on_error():
    mgr = get_session_manager()
    await mgr.clear_all()

    chat_service = AgentChatService()

    # Simula erro no astream do LangGraph
    async def mock_error_astream(*args, **kwargs):
        await asyncio.sleep(0)
        raise RuntimeError("Falha simulada durante o streaming")
        yield  # Make it an async generator

    with patch.object(chat_service.graph, "astream", side_effect=mock_error_astream):
        req = ChatStreamRequestDTO(message="Qual o filme mais lucrativo?", provider="groq", model="test")
        events = [evt async for evt in chat_service.stream_chat(req)]

        # Deve ter emitido session e error
        event_names = [e["event"] for e in events]
        assert "session" in event_names
        assert "error" in event_names

        # SessionManager DEVE estar limpo (desregistrado no finally)
        assert not await mgr.has_active_sessions()
