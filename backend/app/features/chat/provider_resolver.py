from dataclasses import dataclass

from app.features.chat.schemas import ChatStreamRequestDTO


@dataclass
class ResolvedProviderConfig:
    provider: str | None
    model: str | None
    api_key: str | None
    base_url: str | None
    timeout_seconds: int


class ChatProviderResolver:
    """
    Resolve e encapsula a configuração de provedor de LLM ativa a ser utilizada
    no ciclo de vida da requisição de chat.
    """

    @classmethod
    async def resolve(cls, request: ChatStreamRequestDTO) -> ResolvedProviderConfig:
        active_provider = None
        active_model = None
        active_key = None
        active_base_url = None
        active_timeout = 30

        if request.provider_override:
            from app.features.settings.service import get_settings_service

            await get_settings_service().update_config(request.provider_override)
            active_provider = request.provider_override.provider
            active_model = request.provider_override.model
            active_key = request.provider_override.api_key
            active_base_url = request.provider_override.base_url
            active_timeout = request.provider_override.timeout_seconds
        elif request.provider and request.model:
            from app.db.settings_db import get_user_provider_config

            active_provider = request.provider
            active_model = request.model
            saved = await get_user_provider_config("default_user", request.provider)
            if saved:
                active_key = saved.get("api_key")
                active_base_url = saved.get("base_url")
                active_timeout = saved.get("timeout_seconds", 30)
        else:
            from app.db.settings_db import get_active_provider_config

            active = await get_active_provider_config("default_user")
            if active and active.get("provider") and active.get("model"):
                active_provider = active["provider"]
                active_model = active["model"]
                active_key = active.get("api_key")
                active_base_url = active.get("base_url")
                active_timeout = active.get("timeout_seconds", 30)

        if active_provider == "local" and not active_base_url:
            active_base_url = "http://localhost:1234/v1"

        return ResolvedProviderConfig(
            provider=active_provider,
            model=active_model,
            api_key=active_key,
            base_url=active_base_url,
            timeout_seconds=active_timeout,
        )
