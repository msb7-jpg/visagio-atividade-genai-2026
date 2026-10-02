import logging
import time

from langchain_core.messages import HumanMessage

from app.core.config import get_settings
from app.core.llm_factory import PROVIDER_DEFAULTS, get_chat_model, provider_registry
import os
from app.db.settings_db import (
    get_active_provider_config,
    get_all_saved_providers,
    get_all_user_provider_configs,
    get_user_provider_config,
    save_user_provider_config,
)
from app.features.settings.schemas import (
    ProviderConfigDTO,
    SavedProviderSummaryDTO,
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
            saved_configs={},
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
                    saved_configs={},
                )
            self._initialized_from_db = True
        except Exception as exc:
            logger.warning("Não foi possível carregar configurações iniciais do SQLite: %s", exc)

    async def get_current_config(self, masked: bool = True) -> ProviderConfigDTO:
        """Retorna a configuração ativa e a lista de provedores salvos no SQLite com detalhes mascarados."""
        await self._ensure_db_loaded()
        saved_providers = []
        saved_configs_map: dict[str, SavedProviderSummaryDTO] = {}
        try:
            saved_providers = await get_all_saved_providers(self.user_id)
            all_configs = await get_all_user_provider_configs(self.user_id)
            for prov_name, prov_data in all_configs.items():
                saved_configs_map[prov_name] = SavedProviderSummaryDTO(
                    model=prov_data.get("model", ""),
                    api_key=mask_api_key(prov_data.get("api_key")),
                    base_url=prov_data.get("base_url"),
                    timeout_seconds=prov_data.get("timeout_seconds", 30),
                )
        except Exception as exc:
            logger.warning("Falha ao consultar saved_providers no SQLite: %s", exc)

        if not masked:
            res = self._current_config.model_copy()
            res.saved_providers = saved_providers
            res.saved_configs = saved_configs_map
            return res

        return ProviderConfigDTO(
            provider=self._current_config.provider,
            model=self._current_config.model,
            api_key=mask_api_key(self._current_config.api_key),
            base_url=self._current_config.base_url,
            timeout_seconds=self._current_config.timeout_seconds,
            saved_providers=saved_providers,
            saved_configs=saved_configs_map,
        )

    async def update_config(self, new_config: ProviderConfigDTO) -> ProviderConfigDTO:
        """
        Atualiza a configuração ativa e persiste no banco SQLite para o usuário default.
        Se a nova chave vier como máscara ('...') ou vazia e já existir chave salva para o provedor, preserva a chave.
        """
        await self._ensure_db_loaded()
        updated_key = new_config.api_key

        # Verifica se já temos chave salva para esse provedor específico
        existing_prov = await get_user_provider_config(self.user_id, new_config.provider)
        existing_key = existing_prov.get("api_key") if existing_prov else None

        if (not updated_key or "..." in updated_key or updated_key == "********") and existing_key:
            updated_key = existing_key
        elif not updated_key and new_config.provider == self._current_config.provider:
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
        1. Se a chave for mascarada ou omitida, busca no banco SQLite para este provedor ou no .env.
        2. Consulta modelos ativos e executa probe leve.
        """
        await self._ensure_db_loaded()
        provider = request.provider
        defaults = PROVIDER_DEFAULTS.get(provider, {})
        model_name = request.model or defaults.get("model", "unknown-model")

        # Resolve chave do provedor requisitado
        key_to_use = request.api_key
        if not key_to_use or "..." in key_to_use or key_to_use == "********":
            saved_prov = await get_user_provider_config(self.user_id, provider)
            if saved_prov and saved_prov.get("api_key"):
                key_to_use = saved_prov["api_key"]
            else:
                # Fallback para variáveis de ambiente locais
                if provider == "groq":
                    key_to_use = os.getenv("GROQ_API_KEY")
                elif provider == "openrouter":
                    key_to_use = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
                elif provider == "google":
                    key_to_use = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

        start_time = time.perf_counter()

        # 1. Consulta modelos ativos disponíveis como primeira etapa da probe
        available_models: list[str] = []
        strategy = provider_registry.get(provider) if provider_registry.is_registered(provider) else None
        if strategy:
            try:
                available_models = await strategy.list_models(
                    api_key=key_to_use,
                    base_url=request.base_url,
                    timeout_seconds=4.0,
                )
            except Exception as mod_exc:
                logger.debug("Falha na consulta inicial de modelos: %s", mod_exc)

        # Se o modelo solicitado não estiver na lista retornada e a lista contiver modelos, usa o primeiro
        effective_model = model_name
        if available_models and effective_model not in available_models:
            effective_model = available_models[0]

        # 2. Tentativa de Fast Probe via Strategy (ex: curl /health ou /v1/health no llama-server)
        try:
            if strategy:
                is_healthy, msg = await strategy.fast_probe(
                    base_url=request.base_url,
                    api_key=key_to_use,
                    timeout_seconds=float(request.timeout_seconds),
                )
                if is_healthy:
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    success_msg = (
                        f"Conexão com '{provider}' ({effective_model}) estabelecida com sucesso!"
                    )
                    return TestProviderResponseDTO(
                        success=True,
                        latency_ms=latency_ms,
                        model=effective_model,
                        message=success_msg,
                        error_code=None,
                        available_models=available_models,
                    )
        except Exception as fast_exc:
            logger.debug("Fast probe falhou ou não aplicável: %s", fast_exc)

        # 3. Probe padrão via LLM invoke
        try:
            model_instance = get_chat_model(
                provider=provider,
                model=effective_model,
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
                model=effective_model,
                message=f"Conexão com '{provider}' ({effective_model}) estabelecida com sucesso!",
                error_code=None,
                available_models=available_models,
            )

        except Exception as exc:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_str = str(exc).lower()

            logger.warning("Falha na probe de conectividade para '%s': %s", provider, exc)

            # Se conseguimos listar modelos com sucesso, a credencial é comprovadamente válida!
            # Mas o modelo pode estar com limite de quota ou bloqueio temporário
            if "402" in error_str or "resource_exhausted" in error_str or "credits are depleted" in error_str:
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=effective_model,
                    message="Créditos ou cota da chave de API esgotados no provedor (402 Resource Exhausted).",
                    error_code="RESOURCE_EXHAUSTED",
                    available_models=available_models,
                )

            if "401" in error_str or "unauthorized" in error_str or "invalid api key" in error_str:
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=effective_model,
                    message="Chave de API inválida ou não autorizada pelo provedor.",
                    error_code="UNAUTHORIZED",
                    available_models=[],
                )

            if "429" in error_str or "quota" in error_str or "rate limit" in error_str:
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=effective_model,
                    message="Limite de taxa ou cota de requisições excedida no provedor.",
                    error_code="RATE_LIMIT_EXCEEDED",
                    available_models=available_models,
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
                    model=effective_model,
                    message=(
                        f"Não foi possível conectar ao endpoint local ({url_tested}). "
                        "Verifique se o serviço (LM Studio/Ollama) está ativo."
                    ),
                    error_code="CONNECTION_REFUSED",
                    available_models=[],
                )

            if "timed out" in error_str or "timeout" in error_str:
                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=latency_ms,
                    model=effective_model,
                    message=(
                        f"Tempo limite de {request.timeout_seconds}s excedido "
                        "ao tentar conectar ao provedor."
                    ),
                    error_code="TIMEOUT",
                    available_models=available_models,
                )

            return TestProviderResponseDTO(
                success=False,
                latency_ms=latency_ms,
                model=effective_model,
                message=f"Falha de comunicação: {str(exc)[:150]}",
                error_code="PROVIDER_ERROR",
                available_models=available_models,
            )


# Instância singleton do serviço em memória
_settings_service_instance: SettingsService | None = None


def get_settings_service() -> SettingsService:
    global _settings_service_instance
    if _settings_service_instance is None:
        _settings_service_instance = SettingsService()
    return _settings_service_instance
