from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel

from app.core.llm_factory.base import LLMProviderStrategy
from app.core.llm_factory.constants import SUPPORTED_PROVIDERS
from app.core.llm_factory.registry import LLMProviderRegistry
from app.core.llm_factory.strategies import (
    GoogleGenAIProviderStrategy,
    GroqProviderStrategy,
    LocalOpenAIProviderStrategy,
    OpenRouterProviderStrategy,
)

# Instância global do registry pré-populada com todos os provedores suportados
provider_registry = LLMProviderRegistry()
provider_registry.register("groq", GroqProviderStrategy())
provider_registry.register("local", LocalOpenAIProviderStrategy())
provider_registry.register("openrouter", OpenRouterProviderStrategy())
provider_registry.register("google", GoogleGenAIProviderStrategy())

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
    Segue estritamente o princípio Open-Closed (OCP).
    Se provider e model não forem passados, consulta a configuração ativa salva no SQLite (definida pela UI).
    """
    if not provider or not model:
        from app.db.settings_db import get_active_provider_config_sync

        active = get_active_provider_config_sync()
        if active and active.get("provider") and active.get("model"):
            provider = provider or active["provider"]
            model = model or active["model"]
            api_key = api_key or active.get("api_key")
            base_url = base_url or active.get("base_url")
            if timeout_seconds == 30 and active.get("timeout_seconds"):
                timeout_seconds = active["timeout_seconds"]

    if not provider:
        raise ValueError("Provedor não informado e nenhuma configuração ativa encontrada no sistema.")
    if not model:
        raise ValueError(f"Modelo não especificado para o provedor '{provider}'.")

    # Se a chave ou base_url não foram passadas mas o provider foi explicitado, busca a configuração salva daquele provider no DB
    if (not api_key or not base_url) and provider != "local":
        from app.db.settings_db import get_user_provider_config_sync

        saved = get_user_provider_config_sync("default_user", provider)
        if saved:
            if not api_key:
                api_key = saved.get("api_key")
            if not base_url:
                base_url = saved.get("base_url")
    elif provider == "local" and not base_url:
        from app.db.settings_db import get_user_provider_config_sync

        saved = get_user_provider_config_sync("default_user", provider)
        if saved and saved.get("base_url"):
            base_url = saved.get("base_url")

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
    "OpenRouterProviderStrategy",
    "SUPPORTED_PROVIDERS",
    "get_chat_model",
    "provider_registry",
]
