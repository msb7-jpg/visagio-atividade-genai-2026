import os
from abc import ABC, abstractmethod
from typing import Any

import httpx
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

PROVIDER_DEFAULTS: dict[str, dict[str, Any]] = {
    "groq": {
        "model": "llama-3.3-70b-versatile",
        "base_url": None,
    },
    "local": {
        "model": "Qwen3.5-4B-Q4_K_M",
        "base_url": "http://localhost:1234/v1",
    },
    "openrouter": {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "base_url": "https://openrouter.ai/api/v1",
    },
    "google": {
        "model": "gemini-2.0-flash",
        "base_url": None,
    },
    "openai": {
        "model": "gpt-4o-mini",
        "base_url": None,
    },
}


class LLMProviderStrategy(ABC):
    """
    Interface abstrata para estratégias de instanciação e sondagem rápida de LLMs.
    Respeita o Princípio Aberto/Fechado (OCP).
    """

    @abstractmethod
    def create_model(
        self,
        model: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        temperature: float = 0.0,
        timeout_seconds: int = 30,
        **kwargs: Any,
    ) -> BaseChatModel:
        """Instancia e retorna o modelo de chat configurado."""
        pass

    async def fast_probe(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 3.0,
    ) -> tuple[bool, str | None]:
        """
        Executa uma checagem HTTP rápida caso o provedor suporte endpoint de saúde (ex: /health).
        Retorna (suportado_e_ativo, mensagem_ou_erro). Se retornar (False, None),
        indica que deve ser utilizado o ping padrão via LLM ainvoke.
        """
        return False, None


class GroqProviderStrategy(LLMProviderStrategy):
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

        # Injeta kwargs customizados como desativação de thinking para modelos locais
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
        Probe ultrarrápida via endpoint de saúde (/health ou /v1/health) suportado por
        llama.cpp server e LM Studio. Responde em milissegundos sem invocar inferência.
        """
        target_base = (base_url or PROVIDER_DEFAULTS["local"]["base_url"]).rstrip("/")
        # Tenta /health e /v1/health
        candidates = []
        if target_base.endswith("/v1"):
            root = target_base[:-3]
            candidates = [f"{root}/health", f"{target_base}/health"]
        else:
            candidates = [f"{target_base}/health", f"{target_base}/v1/health"]

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

        return False, None


class OpenRouterProviderStrategy(LLMProviderStrategy):
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


class LLMProviderRegistry:
    """
    Registro extensível de estratégias de provedores de LLM.
    Permite registrar novos provedores dinamicamente sem alterar a classe.
    """

    def __init__(self):
        self._strategies: dict[str, LLMProviderStrategy] = {}

    def register(self, provider_name: str, strategy: LLMProviderStrategy) -> None:
        self._strategies[provider_name.strip().lower()] = strategy

    def get(self, provider_name: str) -> LLMProviderStrategy:
        normalized = provider_name.strip().lower()
        if normalized not in self._strategies:
            valid_options = ", ".join(sorted(self._strategies.keys()))
            raise ValueError(
                f"Provedor '{provider_name}' não suportado. Opções válidas: {valid_options}"
            )
        return self._strategies[normalized]

    def is_registered(self, provider_name: str) -> bool:
        return provider_name.strip().lower() in self._strategies


# Instância global do registry pré-populada com os provedores padrão
provider_registry = LLMProviderRegistry()
provider_registry.register("groq", GroqProviderStrategy())
provider_registry.register("local", LocalOpenAIProviderStrategy())
provider_registry.register("openrouter", OpenRouterProviderStrategy())
provider_registry.register("google", GoogleGenAIProviderStrategy())
provider_registry.register("openai", OpenAIProviderStrategy())


def get_chat_model(
    provider: str,
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
    """
    strategy = provider_registry.get(provider)
    return strategy.create_model(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
        timeout_seconds=timeout_seconds,
        **kwargs,
    )
