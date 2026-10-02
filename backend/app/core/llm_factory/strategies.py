import os
from typing import Any

import httpx
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from app.core.llm_factory.base import LLMProviderStrategy
from app.core.llm_factory.constants import PROVIDER_DEFAULTS


class GroqProviderStrategy(LLMProviderStrategy):
    """Estratégia para o provedor Groq."""

    def create_model(
        self,
        model: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        temperature: float = 0.0,
        timeout_seconds: int = 30,
        **kwargs: Any,
    ) -> BaseChatModel:
        resolved_key = api_key or os.getenv("GROQ_API_KEY")
        resolved_model = model or PROVIDER_DEFAULTS["groq"]["model"]
        return ChatGroq(
            model=resolved_model,
            api_key=resolved_key,
            temperature=temperature,
            timeout=float(timeout_seconds),
            **kwargs,
        )


class LocalOpenAIProviderStrategy(LLMProviderStrategy):
    """
    Estratégia para servidor local (LM Studio / Ollama / llama.cpp).
    Sobrescreve fast_probe para checar endpoints /health ou /v1/health sem inferência.
    """

    def create_model(
        self,
        model: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        temperature: float = 0.0,
        timeout_seconds: int = 30,
        **kwargs: Any,
    ) -> BaseChatModel:
        resolved_key = api_key or "local-key-not-required"
        resolved_model = model or PROVIDER_DEFAULTS["local"]["model"]
        resolved_base_url = base_url or PROVIDER_DEFAULTS["local"]["base_url"]

        extra_body = kwargs.pop("extra_body", {})
        if "chat_template_kwargs" not in extra_body:
            extra_body["chat_template_kwargs"] = {"enable_thinking": False}

        return ChatOpenAI(
            model=resolved_model,
            api_key=resolved_key,
            base_url=resolved_base_url,
            temperature=temperature,
            timeout=float(timeout_seconds),
            extra_body=extra_body,
            **kwargs,
        )

    async def fast_probe(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 3.0,
    ) -> tuple[bool, str | None]:
        """
        Sobrescreve a estratégia padrão:
        Executa checagem HTTP em /health ou /v1/health. Se o servidor local não responder
        nesses endpoints, recorre ao método pai (envio de ping leve).
        """
        target_base = (base_url or PROVIDER_DEFAULTS["local"]["base_url"]).rstrip("/")
        if target_base.endswith("/v1"):
            root = target_base[:-3]
            candidates = [f"{root}/health", f"{target_base}/health"]
        else:
            candidates = [f"{target_base}/health", f"{target_base}/v1/health"]

        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                for url in candidates:
                    try:
                        resp = await client.get(url)
                        if resp.status_code == 200:
                            data = resp.json()
                            valid_status = ("ok", "healthy", "ready")
                            if isinstance(data, dict) and data.get("status") in valid_status:
                                return True, "Health check bem-sucedido"
                    except Exception:
                        continue
        except Exception:
            pass

        # Fallback para o comportamento padrão da classe base (ping leve)
        return await super().fast_probe(
            base_url=base_url,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
        )


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
        resolved_key = (
            api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENROUTER_KEY")
        )
        resolved_model = model or PROVIDER_DEFAULTS["openrouter"]["model"]
        resolved_base_url = base_url or PROVIDER_DEFAULTS["openrouter"]["base_url"]

        default_headers = {
            "HTTP-Referer": "https://cinedata.analytics",
            "X-Title": "CineData Analytics Agent",
        }
        if "default_headers" in kwargs:
            default_headers.update(kwargs.pop("default_headers"))

        return ChatOpenAI(
            model=resolved_model,
            api_key=resolved_key,
            base_url=resolved_base_url,
            temperature=temperature,
            timeout=float(timeout_seconds),
            default_headers=default_headers,
            **kwargs,
        )


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
        resolved_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        resolved_model = model or PROVIDER_DEFAULTS["google"]["model"]
        return ChatGoogleGenerativeAI(
            model=resolved_model,
            google_api_key=resolved_key,
            temperature=temperature,
            timeout=float(timeout_seconds),
            **kwargs,
        )


class OpenAIProviderStrategy(LLMProviderStrategy):
    """Estratégia para a API oficial da OpenAI."""

    def create_model(
        self,
        model: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        temperature: float = 0.0,
        timeout_seconds: int = 30,
        **kwargs: Any,
    ) -> BaseChatModel:
        resolved_key = api_key or os.getenv("OPENAI_API_KEY")
        resolved_model = model or PROVIDER_DEFAULTS["openai"]["model"]
        resolved_base_url = base_url or PROVIDER_DEFAULTS["openai"]["base_url"]
        return ChatOpenAI(
            model=resolved_model,
            api_key=resolved_key,
            base_url=resolved_base_url,
            temperature=temperature,
            timeout=float(timeout_seconds),
            **kwargs,
        )
