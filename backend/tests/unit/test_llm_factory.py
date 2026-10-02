import pytest
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from app.core.llm_factory import get_chat_model


def test_llm_factory_groq_instantiation():
    """Verifica instanciação correta do ChatGroq com parâmetros padrão e customizados."""
    model = get_chat_model(
        provider="groq",
        model="openai/gpt-oss-120b",
        api_key="gsk_mock_test_key_12345",
    )
    assert isinstance(model, ChatGroq)
    assert model.model_name == "openai/gpt-oss-120b"
    assert model.temperature == pytest.approx(0.0, abs=1e-5)



def test_llm_factory_local_instantiation():
    """Verifica instanciação correta para modo local (LM Studio/Ollama)."""
    model = get_chat_model(
        provider="local",
        base_url="http://localhost:1234/v1",
        model="Qwen2.5-7B-Instruct",
    )
    assert isinstance(model, ChatOpenAI)
    assert model.model_name == "Qwen2.5-7B-Instruct"
    assert "localhost:1234" in str(model.openai_api_base)


def test_llm_factory_openrouter_instantiation():
    """Verifica instanciação correta para OpenRouter com headers exigidos."""
    model = get_chat_model(
        provider="openrouter",
        api_key="sk-or-mock-key-12345",
        model="meta-llama/llama-3.3-70b-instruct:free",
    )
    assert isinstance(model, ChatOpenAI)
    assert model.model_name == "meta-llama/llama-3.3-70b-instruct:free"
    assert "openrouter.ai" in str(model.openai_api_base)
    assert model.default_headers.get("HTTP-Referer") == "https://cinedata.analytics"


def test_llm_factory_google_instantiation():
    """Verifica instanciação correta para Google AI Studio."""
    model = get_chat_model(
        provider="google",
        api_key="AIzaSyMockKeyForGoogleGenAI_123",
        model="gemini-2.0-flash",
    )
    assert isinstance(model, ChatGoogleGenerativeAI)
    assert model.model == "gemini-2.0-flash"



def test_llm_factory_invalid_provider_raises_error():
    """Garante que provedor desconhecido lança ValueError explicativo."""
    with pytest.raises(ValueError, match="não suportado"):
        get_chat_model(provider="unknown_provider_xyz", model="dummy-model")


def test_llm_factory_missing_model_raises_error():
    """Garante que ausência de modelo lança ValueError."""
    with pytest.raises(ValueError, match="Modelo não especificado"):
        get_chat_model(provider="groq", model=None, api_key="test")


def test_llm_factory_local_thinking_disabled_kwargs():
    """Verifica que o provedor local inclui extra_body com enable_thinking: False por padrão."""
    model = get_chat_model(
        provider="local",
        base_url="http://localhost:1234/v1",
        model="Qwen3.5-4B-Q4_K_M",
    )
    assert isinstance(model, ChatOpenAI)
    assert model.extra_body == {"chat_template_kwargs": {"enable_thinking": False}}


def test_llm_factory_ocp_custom_provider_extension():
    """Verifica princípio OCP: registrar novo provedor sem alterar o core da fábrica."""
    from app.core.llm_factory import LLMProviderStrategy, provider_registry

    class CustomMockProvider(LLMProviderStrategy):
        def create_model(self, **kwargs):
            return ChatOpenAI(model=kwargs.get("model", "custom-mock-v1"), api_key="mock", base_url="http://mock")

    provider_registry.register("custom_mock", CustomMockProvider())

    model = get_chat_model(provider="custom_mock", model="custom-mock-v1")
    assert isinstance(model, ChatOpenAI)
    assert model.model_name == "custom-mock-v1"



@pytest.mark.asyncio
async def test_llm_provider_strategy_default_fast_probe():
    """Verifica que a estratégia padrão de fast_probe envia ping leve via create_model."""
    from unittest.mock import AsyncMock, MagicMock

    from app.core.llm_factory import LLMProviderStrategy

    class DummyStrategy(LLMProviderStrategy):
        def create_model(self, **kwargs):
            mock_model = MagicMock()
            mock_model.ainvoke = AsyncMock(return_value="pong")
            return mock_model

    strategy = DummyStrategy()
    is_healthy, msg = await strategy.fast_probe()
    assert is_healthy is True
    assert msg == "Ping bem-sucedido"


@pytest.mark.asyncio
async def test_local_provider_fast_probe_override():
    """Verifica que LocalOpenAIProviderStrategy sobrescreve fast_probe."""
    from unittest.mock import MagicMock, patch

    from app.core.llm_factory import LocalOpenAIProviderStrategy

    strategy = LocalOpenAIProviderStrategy()

    # Com /health respondendo 200 ok
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"status": "ok"}
        mock_get.return_value = mock_resp

        is_healthy, msg = await strategy.fast_probe(base_url="http://localhost:1234/v1")
        assert is_healthy is True
        assert "Health check" in msg

