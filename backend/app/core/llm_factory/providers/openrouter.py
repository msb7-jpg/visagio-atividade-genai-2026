import logging
from typing import Any

import httpx
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI

from app.core.llm_factory.base import LLMProviderStrategy

logger = logging.getLogger(__name__)


class OpenRouterProviderStrategy(LLMProviderStrategy):
    """Estratégia para o provedor OpenRouter."""

    def create_model(
        self,
        model: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        temperature: float = 0.0,
        timeout_seconds: int = 30,
        **kwargs: Any,
    ) -> BaseChatModel:
        """
        Instancia uma conexão com o OpenRouter via ChatOpenAI.

        Args:
            model: Identificador do modelo no OpenRouter.
            api_key: Chave secreta de autenticação do OpenRouter.
            base_url: Endpoint base (padrão: https://openrouter.ai/api/v1).
            temperature: Temperatura de amostragem.
            timeout_seconds: Limite de tempo em segundos.
            **kwargs: Argumentos extras.

        Returns:
            Instância configurada de ChatOpenAI para o OpenRouter.

        Raises:
            ValueError: Se model ou api_key não forem fornecidos.
        """
        if not model:
            raise ValueError("O parâmetro 'model' é obrigatório para o OpenRouter.")
        if not api_key:
            raise ValueError("A chave de API ('api_key') é obrigatória para o OpenRouter.")

        default_headers = {
            "HTTP-Referer": "https://cinedata.analytics",
            "X-Title": "CineData Analytics Agent",
        }
        if "default_headers" in kwargs:
            default_headers.update(kwargs.pop("default_headers"))

        from pydantic import SecretStr

        return ChatOpenAI(
            model=model,
            api_key=SecretStr(api_key),
            base_url=base_url or "https://openrouter.ai/api/v1",
            temperature=temperature,
            timeout=float(timeout_seconds),
            default_headers=default_headers,
            **kwargs,
        )

    async def list_models(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 5.0,
    ) -> list[str]:
        """
        Verifica a autenticidade da chave e lista os modelos disponíveis no OpenRouter.

        Args:
            api_key: Chave do OpenRouter.
            base_url: Endpoint base (opcional).
            timeout_seconds: Limite de tempo.

        Returns:
            Lista de IDs de modelos disponíveis (gratuitos priorizados).

        Raises:
            ValueError: Se a autenticação falhar ou a requisição for rejeitada.
        """
        if not api_key:
            return []
        headers = {"Authorization": f"Bearer {api_key}"}
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            # 1. Validação estrita da chave
            auth_resp = await client.get("https://openrouter.ai/api/v1/auth/key", headers=headers)
            if auth_resp.status_code in (401, 403):
                raise ValueError("Chave de API do OpenRouter inválida ou não autorizada.")
            if auth_resp.status_code != 200:
                raise ValueError(f"Falha de autenticação OpenRouter ({auth_resp.status_code}): {auth_resp.text[:100]}")

            # 2. Obtém a listagem de modelos
            resp = await client.get("https://openrouter.ai/api/v1/models", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                models = [model_item["id"] for model_item in data.get("data", []) if "id" in model_item]
                free_models = [model_name for model_name in models if ":free" in model_name]
                other_models = [model_name for model_name in models if ":free" not in model_name]
                return free_models + other_models[:40]

            if resp.status_code in (401, 403):
                raise ValueError("Chave de API do OpenRouter não autorizada.")

            raise ValueError(f"Falha ao consultar modelos OpenRouter: HTTP {resp.status_code}")
