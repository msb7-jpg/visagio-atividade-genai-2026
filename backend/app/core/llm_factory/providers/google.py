import logging
from typing import Any

import httpx
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.llm_factory.base import LLMProviderStrategy

logger = logging.getLogger(__name__)


class GoogleGenAIProviderStrategy(LLMProviderStrategy):
    """Estratégia para o provedor Google Gemini."""

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
        Instancia uma conexão ChatGoogleGenerativeAI.

        Args:
            model: Identificador do modelo no Google Gemini.
            api_key: Chave de API Google.
            base_url: Endpoint base personalizado (ignorado pelo SDK oficial do Google).
            temperature: Temperatura de amostragem.
            timeout_seconds: Limite de tempo em segundos.
            **kwargs: Argumentos extras.

        Returns:
            Instância configurada de ChatGoogleGenerativeAI.

        Raises:
            ValueError: Se model ou api_key não forem fornecidos.
        """
        if not model:
            raise ValueError("O parâmetro 'model' é obrigatório para o Google Gemini.")
        if not api_key:
            raise ValueError("A chave de API ('api_key') é obrigatória para o Google Gemini.")

        effective_timeout = max(float(timeout_seconds), 10.0)
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=temperature,
            timeout=effective_timeout,
            **kwargs,
        )

    async def list_models(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 5.0,
    ) -> list[str]:
        """
        Consulta os modelos Gemini disponíveis para geração de conteúdo.

        Args:
            api_key: Chave de API Google.
            base_url: Endpoint customizado (opcional).
            timeout_seconds: Limite de tempo.

        Returns:
            Lista de nomes de modelos disponíveis.

        Raises:
            ValueError: Se a chave for inválida ou se a chamada à API falhar.
        """
        if not api_key:
            return []
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.get(url)
            if resp.status_code in (400, 401, 403):
                raise ValueError("Chave de API do Google Gemini inválida ou não autorizada.")
            if resp.status_code == 200:
                data = resp.json()
                models = []
                for model_data in data.get("models", []):
                    name = model_data.get("name", "").removeprefix("models/")
                    methods = model_data.get("supportedGenerationMethods", [])
                    if "generateContent" in methods and "gemini" in name:
                        models.append(name)
                return models

            raise ValueError(f"Falha ao consultar modelos Google: HTTP {resp.status_code}")
