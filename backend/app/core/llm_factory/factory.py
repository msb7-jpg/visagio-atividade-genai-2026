from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel

from app.core.constants import LLMProvider
from app.core.llm_factory.registry import LLMProviderRegistry
from app.core.llm_factory.strategies import (
    GoogleGenAIProviderStrategy,
    GroqProviderStrategy,
    LocalOpenAIProviderStrategy,
    OpenRouterProviderStrategy,
)

# Instância global do registry pré-populada com todos os provedores suportados
provider_registry = LLMProviderRegistry()
provider_registry.register(LLMProvider.GROQ, GroqProviderStrategy())
provider_registry.register(LLMProvider.LOCAL, LocalOpenAIProviderStrategy())
provider_registry.register(LLMProvider.OPENROUTER, OpenRouterProviderStrategy())
provider_registry.register(LLMProvider.GOOGLE, GoogleGenAIProviderStrategy())


def _resolve_saved_credentials(
    provider: str, api_key: str | None, base_url: str | None
) -> tuple[str | None, str | None]:
    """Recupera credenciais salvas no banco de dados para o provedor quando não passadas explicitamente."""
    from app.db.settings_db import get_user_provider_config_sync

    saved = get_user_provider_config_sync("default_user", provider)
    if not saved:
        return api_key, base_url

    resolved_key = api_key or saved.get("api_key")
    resolved_url = base_url or saved.get("base_url")
    return resolved_key, resolved_url


def _resolve_active_config(
    provider: str | None,
    model: str | None,
    api_key: str | None,
    base_url: str | None,
    timeout_seconds: int,
) -> tuple[str | None, str | None, str | None, str | None, int]:
    """Preenche parâmetros a partir da configuração ativa no SQLite caso omitidos."""
    if provider and model:
        return provider, model, api_key, base_url, timeout_seconds

    from app.db.settings_db import get_active_provider_config_sync

    active = get_active_provider_config_sync()
    if active and active.get("provider") and active.get("model"):
        p = provider or active["provider"]
        m = model or active["model"]
        k = api_key or active.get("api_key")
        u = base_url or active.get("base_url")
        t = (
            active.get("timeout_seconds")
            if timeout_seconds == 30 and active.get("timeout_seconds")
            else timeout_seconds
        )
        return p, m, k, u, t

    return provider, model, api_key, base_url, timeout_seconds


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

    Segue estritamente o princípio Open-Closed (OCP). Se provider e model não forem passados,
    consulta a configuração ativa salva no SQLite (definida pela UI).

    Args:
        provider: Identificador do provedor (ex: 'groq', 'google', 'local', 'openrouter').
        model: Identificador do modelo no provedor.
        api_key: Chave de API secreta para autenticação.
        base_url: URL base personalizada para o provedor (obrigatória para 'local').
        temperature: Temperatura do modelo (padrão: 0.0).
        timeout_seconds: Limite de tempo em segundos para requisições (padrão: 30).
        **kwargs: Parâmetros extras repassados ao construtor do modelo LangChain.

    Returns:
        Instância concreta de BaseChatModel pronta para uso.

    Raises:
        ValueError: Se o provedor ou modelo não forem informados ou não estiverem configurados.
    """
    provider, model, api_key, base_url, timeout_seconds = _resolve_active_config(
        provider, model, api_key, base_url, timeout_seconds
    )

    if not provider:
        raise ValueError("Provedor não informado e nenhuma configuração ativa encontrada no sistema.")
    if not model:
        raise ValueError(f"Modelo não especificado para o provedor '{provider}'.")

    # Se a chave ou base_url não foram passadas, busca credenciais salvas no banco
    if (not api_key or not base_url) and provider != LLMProvider.LOCAL:
        api_key, base_url = _resolve_saved_credentials(provider, api_key, base_url)
    elif provider == LLMProvider.LOCAL and not base_url:
        _, base_url = _resolve_saved_credentials(provider, api_key, base_url)

    strategy = provider_registry.get(provider)
    return strategy.create_model(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
        timeout_seconds=timeout_seconds,
        **kwargs,
    )
