from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel

from app.core.llm_factory.base import LLMProviderStrategy
from app.core.llm_factory.constants import PROVIDER_DEFAULTS
from app.core.llm_factory.registry import LLMProviderRegistry
from app.core.llm_factory.strategies import (
    GoogleGenAIProviderStrategy,
    GroqProviderStrategy,
    LocalOpenAIProviderStrategy,
    OpenAIProviderStrategy,
    OpenRouterProviderStrategy,
)

# Instância global do registry pré-populada com todos os provedores suportados
provider_registry = LLMProviderRegistry()
provider_registry.register("groq", GroqProviderStrategy())
provider_registry.register("local", LocalOpenAIProviderStrategy())
provider_registry.register("openrouter", OpenRouterProviderStrategy())
provider_registry.register("google", GoogleGenAIProviderStrategy())
provider_registry.register("openai", OpenAIProviderStrategy())


def get_chat_model(
    provider: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.0,
    timeout_seconds: int = 30,
    **kwargs: Any,
) -> BaseChatModel:
    """
    Fábrica extensível para instanciar instâncias de BaseChatModel consultando o Provider Registry.
    Segue estritamente o princípio Open-Closed (OCP). Se provider não for especificado,
    utiliza a configuração ativa do ambiente (Settings).
    """
    if not provider:
        from app.core.config import get_settings

        app_settings = get_settings()
        provider = app_settings.llm_provider
        if not model:
            model = app_settings.llm_model
        if not api_key:
            api_key = app_settings.llm_api_key
        if not base_url:
            base_url = app_settings.llm_base_url
        if timeout_seconds == 30 and app_settings.llm_timeout_seconds:
            timeout_seconds = app_settings.llm_timeout_seconds

    strategy = provider_registry.get(provider)
    return strategy.create_model(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
        timeout_seconds=timeout_seconds,
        **kwargs,
    )


__all__ = [
    "GoogleGenAIProviderStrategy",
    "GroqProviderStrategy",
    "LLMProviderRegistry",
    "LLMProviderStrategy",
    "LocalOpenAIProviderStrategy",
    "OpenAIProviderStrategy",
    "OpenRouterProviderStrategy",
    "PROVIDER_DEFAULTS",
    "get_chat_model",
    "provider_registry",
]
