import logging
import time

from langchain_core.messages import HumanMessage

from app.core.config import get_settings
from app.core.llm_factory import PROVIDER_DEFAULTS, get_chat_model, provider_registry
from app.db.settings_db import (
    get_active_provider_config,
    get_all_saved_providers,
    save_user_provider_config,
)
from app.features.settings.schemas import (
    ProviderConfigDTO,
    TestProviderRequestDTO,
    TestProviderResponseDTO,
)

logger = logging.getLogger(__name__)


def mask_api_key(key: str | None) -> str | None:
    """Mascara uma chave de API para retorno seguro via HTTP."""
    if not key:
        return None
    trimmed = key.strip()
    if len(trimmed) <= 8:
        return "********"
    return f"{trimmed[:4]}...{trimmed[-4:]}"


class SettingsService:
    """Gerencia a configuração ativa de provedores, persistência SQLite e probes rápidas."""

    def __init__(self, user_id: str = "default_user"):
        self.user_id = user_id
        settings = get_settings()
        self._current_config = ProviderConfigDTO(
            provider=settings.llm_provider,  # type: ignore[arg-type]
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout_seconds=settings.llm_timeout_seconds,
            saved_providers=[],
        )
        self._initialized_from_db = False

    async def _ensure_db_loaded(self) -> None:
        """Carrega configuração inicial salva do banco caso exista."""
        if self._initialized_from_db:
            return

        try:
            saved = await get_active_provider_config(self.user_id)
            if saved:
                self._current_config = ProviderConfigDTO(
                    provider=saved["provider"],
                    model=saved["model"],
                    api_key=saved["api_key"],
                    base_url=saved["base_url"],
                    timeout_seconds=saved["timeout_seconds"],
                    saved_providers=[],
                )
            self._initialized_from_db = True
        except Exception as exc:
            logger.warning("Não foi possível carregar configurações iniciais do SQLite: %s", exc)

    async def get_current_config(self, masked: bool = True) -> ProviderConfigDTO:
        """Retorna a configuração ativa e a lista de provedores salvos no SQLite."""
        await self._ensure_db_loaded()
        saved_providers = []
        try:
            saved_providers = await get_all_saved_providers(self.user_id)
        except Exception as exc:
            logger.warning("Falha ao consultar saved_providers no SQLite: %s", exc)

        if not masked:
            res = self._current_config.model_copy()
            res.saved_providers = saved_providers
            return res

        return ProviderConfigDTO(
            provider=self._current_config.provider,
            model=self._current_config.model,
            api_key=mask_api_key(self._current_config.api_key),
            base_url=self._current_config.base_url,
            timeout_seconds=self._current_config.timeout_seconds,
            saved_providers=saved_providers,
        )

    async def update_config(self, new_config: ProviderConfigDTO) -> ProviderConfigDTO:
        """
        Atualiza a configuração ativa e persiste no banco SQLite para o usuário default.
        Se a nova chave vier como máscara ('...'), preserva a chave anterior.
        """
        await self._ensure_db_loaded()
        updated_key = new_config.api_key
        if updated_key and ("..." in updated_key or updated_key == "********"):
            updated_key = self._current_config.api_key

        self._current_config = ProviderConfigDTO(
            provider=new_config.provider,
            model=new_config.model,
            api_key=updated_key,
            base_url=new_config.base_url,
            timeout_seconds=new_config.timeout_seconds,
        )

        try:
            await save_user_provider_config(
                user_id=self.user_id,
                provider=new_config.provider,
                model=new_config.model,
                api_key=updated_key,
                base_url=new_config.base_url,
                timeout_seconds=new_config.timeout_seconds,
            )
        except Exception as exc:
            logger.error("Falha ao salvar configuração de modelo no banco SQLite: %s", exc)

        return await self.get_current_config(masked=True)

    async def test_provider(self, request: TestProviderRequestDTO) -> TestProviderResponseDTO:
        """
        Executa probe em tempo real:
        1. Se a estratégia suportar fast_probe (ex: endpoint /health ou /v1/health em local),
           executa checagem HTTP em milissegundos sem invocar inferência.
        2. Fallback para probe padrão leve via LangChain ainvoke([HumanMessage('ping')]).
        """
        await self._ensure_db_loaded()
        provider = request.provider
        defaults = PROVIDER_DEFAULTS.get(provider, {})
        model_name = request.model or defaults.get("model", "unknown-model")

        # Resolve chave: se a chave enviada for mascarada, usa a chave persistida
        key_to_use = request.api_key
        if key_to_use and ("..." in key_to_use or key_to_use == "********"):
            key_to_use = self._current_config.api_key

        start_time = time.perf_counter()

        # 1. Tentativa de Fast Probe via Strategy (ex: curl /health ou /v1/health no llama-server)
        try:
            if provider_registry.is_registered(provider):
                strategy = provider_registry.get(provider)
                is_healthy, msg = await strategy.fast_probe(
                    base_url=request.base_url,
                    api_key=key_to_use,
                    timeout_seconds=float(request.timeout_seconds),
                )
                if is_healthy:
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    success_msg = (
                        f"Conexão com '{provider}' ({model_name}) estabelecida com sucesso!"
                    )
                    return TestProviderResponseDTO(
                        success=True,
                        latency_ms=latency_ms,
                        model=model_name,
                        message=success_msg,
                        error_code=None,
                    )
        except Exception as fast_exc:
            logger.debug("Fast probe falhou ou não aplicável: %s", fast_exc)

        # 2. Probe padrão via LLM invoke
        try:
            model_instance = get_chat_model(
                provider=provider,
                model=model_name,
                api_key=key_to_use,
                base_url=request.base_url,
                timeout_seconds=request.timeout_seconds,
            )

            # Probe efêmera com mensagem mínima
            await model_instance.ainvoke([HumanMessage(content="ping")])
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            return TestProviderResponseDTO(
                success=True,
                latency_ms=latency_ms,
                model=model_name,
                message=f"Conexão com '{provider}' ({model_name}) estabelecida com sucesso!",
                error_code=None,
            )

        except Exception as exc:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_str = str(exc).lower()

            logger.warning("Falha na probe de conectividade para '%s': %s", provider, exc)

            if "401" in error_str or "unauthorized" in error_str or "invalid api key" in error_str:
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=model_name,
                    message="Chave de API inválida ou não autorizada pelo provedor.",
                    error_code="UNAUTHORIZED",
                )

            if "429" in error_str or "quota" in error_str or "rate limit" in error_str:
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=model_name,
                    message="Limite de taxa ou cota de requisições excedida no provedor.",
                    error_code="RATE_LIMIT_EXCEEDED",
                )

            if (
                "connection refused" in error_str
                or "connecterror" in error_str
                or "failed to connect" in error_str
            ):
                url_tested = request.base_url or defaults.get("base_url") or "localhost"
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=model_name,
                    message=(
                        f"Não foi possível conectar ao endpoint local ({url_tested}). "
                        "Verifique se o serviço (LM Studio/Ollama) está ativo."
                    ),
                    error_code="CONNECTION_REFUSED",
                )

            if "timed out" in error_str or "timeout" in error_str:
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=model_name,
                    message=(
                        f"Tempo limite de {request.timeout_seconds}s excedido "
                        "ao tentar conectar ao provedor."
                    ),
                    error_code="TIMEOUT",
                )

            return TestProviderResponseDTO(
                success=False,
                latency_ms=latency_ms,
                model=model_name,
                message=f"Falha de comunicação: {str(exc)[:150]}",
                error_code="PROVIDER_ERROR",
            )


# Instância singleton do serviço em memória
_settings_service_instance: SettingsService | None = None


def get_settings_service() -> SettingsService:
    global _settings_service_instance
    if _settings_service_instance is None:
        _settings_service_instance = SettingsService()
    return _settings_service_instance
