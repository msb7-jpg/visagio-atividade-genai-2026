import logging
import os
from typing import Any

from app.core.llm_factory import provider_registry
from app.core.timer import ExecutionTimer
from app.db.settings_db import get_user_provider_config
from app.features.settings.schemas import (
    TestProviderRequestDTO,
    TestProviderResponseDTO,
)

logger = logging.getLogger(__name__)


class ProviderProbeService:
    """
    Serviço especializado em testes de conectividade e sondagem ativa (probe) de provedores de IA.
    Isola a resolução de fallbacks de chaves, verificação de servidores locais e listagem de modelos.
    """

    @classmethod
    async def resolve_credentials(
        cls, user_id: str, request: TestProviderRequestDTO
    ) -> tuple[str | None, str | None]:
        provider = request.provider
        key_to_use = request.api_key

        if not key_to_use or "..." in key_to_use or key_to_use == "********":
            saved_prov = await get_user_provider_config(user_id, provider)
            if saved_prov and saved_prov.get("api_key"):
                key_to_use = saved_prov["api_key"]
            else:
                if provider == "groq":
                    key_to_use = os.getenv("GROQ_API_KEY")
                elif provider == "openrouter":
                    key_to_use = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
                elif provider == "google":
                    key_to_use = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

        base_url_to_use = request.base_url
        if not base_url_to_use and provider == "local":
            saved_prov = await get_user_provider_config(user_id, provider)
            if saved_prov and saved_prov.get("base_url"):
                base_url_to_use = saved_prov["base_url"]
            else:
                base_url_to_use = "http://localhost:1234/v1"

        return key_to_use, base_url_to_use

    @classmethod
    async def test_provider(
        cls, user_id: str, request: TestProviderRequestDTO
    ) -> TestProviderResponseDTO:
        provider = request.provider
        key_to_use, base_url_to_use = await cls.resolve_credentials(user_id, request)

        available_models: list[str] = []
        strategy = (
            provider_registry.get(provider)
            if provider_registry.is_registered(provider)
            else None
        )

        with ExecutionTimer() as timer:
            try:
                if strategy:
                    if provider == "local":
                        is_healthy, _ = await strategy.fast_probe(
                            base_url=base_url_to_use,
                            api_key=key_to_use,
                            timeout_seconds=float(request.timeout_seconds),
                        )
                        if not is_healthy:
                            raise ConnectionRefusedError(
                                f"Não foi possível conectar ao servidor local em {base_url_to_use}"
                            )

                    available_models = await strategy.list_models(
                        api_key=key_to_use,
                        base_url=base_url_to_use,
                        timeout_seconds=float(request.timeout_seconds),
                    )

                effective_model = request.model
                if not effective_model and available_models:
                    effective_model = available_models[0]
                elif not effective_model:
                    saved_prov = await get_user_provider_config(user_id, provider)
                    effective_model = (
                        saved_prov["model"]
                        if (saved_prov and saved_prov.get("model"))
                        else "default"
                    )

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
                logger.warning(
                    "Falha na validação de conectividade para '%s': %s", provider, exc
                )
                effective_model = request.model or "unknown-model"
                error_str = str(exc).lower()

                if (
                    "401" in error_str
                    or "unauthorized" in error_str
                    or "invalid" in error_str
                    or "inválida" in error_str
                    or "não autorizada" in error_str
                    or "403" in error_str
                ):
                    return TestProviderResponseDTO(
                        success=False,
                        latency_ms=timer.elapsed_ms,
                        model=effective_model,
                        message=f"Chave de API inválida ou não autorizada para o provedor '{provider}'.",
                        error_code="UNAUTHORIZED",
                        available_models=[],
                    )

                if "402" in error_str or "resource_exhausted" in error_str:
                    return TestProviderResponseDTO(
                        success=False,
                        latency_ms=timer.elapsed_ms,
                        model=effective_model,
                        message="Créditos ou cota da chave de API esgotados no provedor (402 Resource Exhausted).",
                        error_code="RESOURCE_EXHAUSTED",
                        available_models=[],
                    )

                if (
                    "connection refused" in error_str
                    or "connecterror" in error_str
                    or "failed to connect" in error_str
                    or isinstance(exc, ConnectionRefusedError)
                ):
                    url_tested = base_url_to_use or "localhost"
                    return TestProviderResponseDTO(
                        success=False,
                        latency_ms=timer.elapsed_ms,
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
                        latency_ms=timer.elapsed_ms,
                        model=effective_model,
                        message=f"Tempo limite de {request.timeout_seconds}s excedido ao tentar conectar ao provedor.",
                        error_code="TIMEOUT",
                        available_models=[],
                    )

                return TestProviderResponseDTO(
                    success=False,
                    latency_ms=timer.elapsed_ms,
                    model=effective_model,
                    message=f"Falha de comunicação: {str(exc)[:150]}",
                    error_code="PROVIDER_ERROR",
                    available_models=[],
                )
