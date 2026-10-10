import logging
import os

from app.core.constants import LLMProvider
from app.core.llm_factory import provider_registry
from app.core.llm_factory.base import LLMProviderStrategy
from app.core.timer import ExecutionTimer
from app.db.settings_db import get_user_provider_config
from app.features.settings.schemas import TestProviderRequestDTO, TestProviderResponseDTO

logger = logging.getLogger(__name__)


class ProviderProbeService:
    """
    Serviço especializado na sondagem (health check / ping) e descoberta
    de modelos de provedores de LLM.
    """

    @classmethod
    async def resolve_credentials(cls, user_id: str, request: TestProviderRequestDTO) -> tuple[str | None, str | None]:
        """
        Determina as credenciais efetivas a serem testadas.

        Prioriza a chave/url da requisição. Se omitidas, recupera do banco local
        ou, em último caso, das variáveis de ambiente.

        Args:
            user_id: Identificador do usuário para consulta de credenciais salvas.
            request: DTO de requisição de teste de provedor.

        Returns:
            Tupla (chave_api_efetiva, base_url_efetiva).
        """
        provider = request.provider
        key_to_use = request.api_key

        from app.features.settings.security import is_masked_api_key

        if not key_to_use or is_masked_api_key(key_to_use):
            saved_prov = await get_user_provider_config(user_id, provider)
            if saved_prov and saved_prov.get("api_key"):
                key_to_use = saved_prov["api_key"]
            else:
                if provider == LLMProvider.GROQ:
                    key_to_use = os.getenv("GROQ_API_KEY")
                elif provider == LLMProvider.OPENROUTER:
                    key_to_use = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
                elif provider == LLMProvider.GOOGLE:
                    key_to_use = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        base_url_to_use = request.base_url
        if not base_url_to_use and provider == LLMProvider.LOCAL:
            saved_prov = await get_user_provider_config(user_id, provider)
            if saved_prov and saved_prov.get("base_url"):
                base_url_to_use = saved_prov["base_url"]
            else:
                base_url_to_use = "http://localhost:1234/v1"

        return key_to_use, base_url_to_use

    @staticmethod
    async def _probe_strategy(
        strategy: LLMProviderStrategy | None,
        provider: str,
        key: str | None,
        base_url: str | None,
        timeout_seconds: float,
    ) -> list[str]:
        """Executa o probe específico da estratégia do provedor."""
        if not strategy:
            return []

        if provider == LLMProvider.LOCAL:
            is_healthy, _ = await strategy.fast_probe(
                base_url=base_url,
                api_key=key,
                timeout_seconds=timeout_seconds,
            )
            if not is_healthy:
                raise ConnectionRefusedError(f"Não foi possível conectar ao servidor local em {base_url}")

        return await strategy.list_models(
            api_key=key,
            base_url=base_url,
            timeout_seconds=timeout_seconds,
        )

    @staticmethod
    async def _resolve_effective_model(
        user_id: str,
        provider: str,
        requested_model: str | None,
        available_models: list[str],
    ) -> str:
        """Resolve o identificador final do modelo testado."""
        if requested_model:
            return requested_model
        if available_models:
            return available_models[0]

        saved_prov = await get_user_provider_config(user_id, provider)
        if saved_prov and saved_prov.get("model"):
            return saved_prov["model"]
        return "default"

    @staticmethod
    def _map_probe_error(
        exc: Exception,
        provider: str,
        effective_model: str,
        elapsed_ms: int,
        base_url_to_use: str | None,
        timeout_seconds: int,
    ) -> TestProviderResponseDTO:
        """Mapeia exceções de rede e autenticação para respostas estruturadas de teste."""
        error_str = str(exc).lower()

        if any(term in error_str for term in ("401", "unauthorized", "invalid", "inválida", "não autorizada", "403")):
            return TestProviderResponseDTO(
                success=False,
                latency_ms=elapsed_ms,
                model=effective_model,
                message=f"Chave de API inválida ou não autorizada para o provedor '{provider}'.",
                error_code="UNAUTHORIZED",
                available_models=[],
            )

        if "402" in error_str or "resource_exhausted" in error_str:
            return TestProviderResponseDTO(
                success=False,
                latency_ms=elapsed_ms,
                model=effective_model,
                message="Créditos ou cota da chave de API esgotados no provedor (402 Resource Exhausted).",
                error_code="RESOURCE_EXHAUSTED",
                available_models=[],
            )

        is_conn_error = any(
            term in error_str for term in ("connection refused", "connecterror", "failed to connect")
        ) or isinstance(exc, ConnectionRefusedError)
        if is_conn_error:
            url_tested = base_url_to_use or "localhost"
            return TestProviderResponseDTO(
                success=False,
                latency_ms=elapsed_ms,
                model=effective_model,
                message=(
                    f"Não foi possível conectar ao endpoint local ({url_tested}). "
                    "Verifique se o serviço (LM Studio/Ollama/llama.cpp) está ativo."
                ),
                error_code="CONNECTION_REFUSED",
                available_models=[],
            )

        if "timed out" in error_str or "timeout" in error_str:
            return TestProviderResponseDTO(
                success=False,
                latency_ms=elapsed_ms,
                model=effective_model,
                message=f"Tempo limite de {timeout_seconds}s excedido ao tentar conectar ao provedor.",
                error_code="TIMEOUT",
                available_models=[],
            )

        return TestProviderResponseDTO(
            success=False,
            latency_ms=elapsed_ms,
            model=effective_model,
            message=f"Falha de comunicação: {str(exc)[:150]}",
            error_code="PROVIDER_ERROR",
            available_models=[],
        )

    @classmethod
    async def test_provider(cls, user_id: str, request: TestProviderRequestDTO) -> TestProviderResponseDTO:
        """
        Executa teste de conectividade e listagem de modelos contra o provedor especificado.

        Args:
            user_id: Identificador do usuário solicitante.
            request: Parâmetros do teste de conectividade (provedor, credenciais, timeouts).

        Returns:
            TestProviderResponseDTO com status de sucesso, latência e modelos disponíveis.
        """
        provider = request.provider
        key_to_use, base_url_to_use = await cls.resolve_credentials(user_id, request)
        timeout = float(request.timeout_seconds)

        strategy = provider_registry.get(provider) if provider_registry.is_registered(provider) else None

        with ExecutionTimer() as timer:
            try:
                available_models = await cls._probe_strategy(strategy, provider, key_to_use, base_url_to_use, timeout)

                effective_model = await cls._resolve_effective_model(user_id, provider, request.model, available_models)

                model_count = len(available_models)
                success_msg = (
                    f"Conexão com '{provider}' estabelecida com sucesso! "
                    f"({model_count} modelos disponíveis encontrados)"
                    if model_count > 0
                    else f"Conexão com '{provider}' estabelecida com sucesso!"
                )

                return TestProviderResponseDTO(
                    success=True,
                    latency_ms=timer.elapsed_ms,
                    model=effective_model,
                    message=success_msg,
                    error_code=None,
                    available_models=available_models,
                )

            except Exception as exc:
                logger.warning("Falha na validação de conectividade para '%s': %s", provider, exc)
                effective_model = request.model or "unknown-model"
                return cls._map_probe_error(
                    exc=exc,
                    provider=provider,
                    effective_model=effective_model,
                    elapsed_ms=timer.duration_ms_int,
                    base_url_to_use=base_url_to_use,
                    timeout_seconds=request.timeout_seconds,
                )
