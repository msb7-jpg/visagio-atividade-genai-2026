from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from langchain_core.messages import AIMessage

from main import app


@pytest.mark.asyncio
async def test_get_and_update_provider_config():
    """Testa leitura e atualização da configuração do provedor via API REST."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET inicial
        res = await client.get("/settings/provider")
        assert res.status_code == 200
        data = res.json()
        assert "provider" in data
        assert "model" in data

        # 2. Atualizar para Groq com chave
        payload = {
            "provider": "groq",
            "model": "llama-3.3-70b-versatile",
            "api_key": "gsk_test1234567890",
            "base_url": None,
            "timeout_seconds": 25,
        }
        res_post = await client.post("/settings/provider", json=payload)
        assert res_post.status_code == 200
        updated = res_post.json()
        assert updated["provider"] == "groq"
        assert updated["model"] == "llama-3.3-70b-versatile"
        # Garante que a chave vem mascarada
        assert updated["api_key"] == "gsk_...7890"


@pytest.mark.asyncio
async def test_test_provider_probe_success():
    """Testa endpoint /settings/test-provider simulando resposta bem-sucedida."""
    mock_model = AsyncMock()
    mock_model.ainvoke.return_value = AIMessage(content="pong")

    with patch("app.features.settings.service.get_chat_model", return_value=mock_model):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "provider": "groq",
                "model": "llama-3.3-70b-versatile",
                "api_key": "gsk_valida_key",
                "timeout_seconds": 5,
            }
            res = await client.post("/settings/test-provider", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["latency_ms"] >= 0
            assert "estabelecida com sucesso" in data["message"]
            assert "available_models" in data
            assert isinstance(data["available_models"], list)


@pytest.mark.asyncio
async def test_test_provider_probe_401_unauthorized():
    """Testa tratamento amigável de erro 401 (chave inválida)."""
    mock_model = AsyncMock()
    mock_model.ainvoke.side_effect = Exception("401 Client Error: Unauthorized - Invalid API Key")

    with patch("app.features.settings.service.get_chat_model", return_value=mock_model):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "provider": "openrouter",
                "api_key": "sk-or-invalid",
                "timeout_seconds": 5,
            }
            res = await client.post("/settings/test-provider", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is False
            assert data["error_code"] == "UNAUTHORIZED"
            assert "inválida" in data["message"].lower()


@pytest.mark.asyncio
async def test_test_provider_probe_connection_refused():
    """Testa tratamento amigável de erro de conexão recusada em servidor local offline."""
    mock_model = AsyncMock()
    mock_model.ainvoke.side_effect = Exception("Connection refused on http://localhost:9999/v1")

    fast_probe_patch = patch(
        "app.core.llm_factory.LocalOpenAIProviderStrategy.fast_probe",
        return_value=(False, None),
    )
    with (
        patch("app.features.settings.service.get_chat_model", return_value=mock_model),
        fast_probe_patch,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "provider": "local",
                "base_url": "http://localhost:9999/v1",
                "timeout_seconds": 5,
            }
            res = await client.post("/settings/test-provider", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is False
            assert data["error_code"] == "CONNECTION_REFUSED"
            assert "não foi possível conectar ao endpoint local" in data["message"].lower()


@pytest.mark.asyncio
async def test_test_provider_fast_probe_success():
    """Testa fast probe HTTP via /health com resposta imediata."""
    fast_probe_mock = patch(
        "app.core.llm_factory.LocalOpenAIProviderStrategy.fast_probe",
        return_value=(True, "Health check bem-sucedido"),
    )
    with fast_probe_mock:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "provider": "local",
                "base_url": "http://localhost:1234/v1",
                "timeout_seconds": 5,
            }
            res = await client.post("/settings/test-provider", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["latency_ms"] >= 0
            assert "estabelecida com sucesso" in data["message"]


@pytest.mark.asyncio
async def test_sqlite_persistence_and_saved_providers():
    """Testa persistência da configuração de modelo no banco SQLite e retorno de saved_providers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Salva configuração para local
        payload_local = {
            "provider": "local",
            "model": "Qwen3.5-4B-Q4_K_M",
            "base_url": "http://localhost:1234/v1",
            "timeout_seconds": 20,
        }
        res_post = await client.post("/settings/provider", json=payload_local)
        assert res_post.status_code == 200
        saved = res_post.json()
        assert "local" in saved["saved_providers"]

        # Salva configuração para groq
        payload_groq = {
            "provider": "groq",
            "model": "llama-3.3-70b-versatile",
            "api_key": "gsk_persist_12345678",
            "timeout_seconds": 25,
        }
        res_post_groq = await client.post("/settings/provider", json=payload_groq)
        assert res_post_groq.status_code == 200
        saved_groq = res_post_groq.json()
        assert "groq" in saved_groq["saved_providers"]
        assert "local" in saved_groq["saved_providers"]
        assert "saved_configs" in saved_groq
        assert "groq" in saved_groq["saved_configs"]
        assert "local" in saved_groq["saved_configs"]
        assert saved_groq["saved_configs"]["groq"]["model"] == "llama-3.3-70b-versatile"
        assert saved_groq["saved_configs"]["local"]["model"] == "Qwen3.5-4B-Q4_K_M"

