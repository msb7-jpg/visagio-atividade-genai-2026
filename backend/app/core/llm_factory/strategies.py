from typing import Any

import httpx
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from app.core.llm_factory.base import LLMProviderStrategy


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
        if not model:
            raise ValueError("O parâmetro 'model' é obrigatório para o provedor Groq.")
        if not api_key:
            raise ValueError("A chave de API ('api_key') é obrigatória para o provedor Groq.")

        return ChatGroq(
            model=model,
            api_key=api_key,
            temperature=temperature,
            timeout=float(timeout_seconds),
            **kwargs,
        )

    async def list_models(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 5.0,
    ) -> list[str]:
        if not api_key:
            return []
        headers = {"Authorization": f"Bearer {api_key}"}
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.get("https://api.groq.com/openai/v1/models", headers=headers)
            if resp.status_code in (401, 403):
                raise ValueError("Chave de API do Groq inválida ou não autorizada.")
            if resp.status_code == 200:
                data = resp.json()
                raw_items = data.get("data", [])
                chat_models: list[str] = []
                for item in raw_items:
                    model_id = item.get("id", "")
                    if not item.get("active", True):
                        continue
                    # Filtrar modelos de transcrição/áudio e guardrails
                    lowered = model_id.lower()
                    if any(kw in lowered for kw in ("whisper", "guard", "orpheus", "tts", "audio")):
                        continue
                    output_modalities = item.get("output_modalities") or ["text"]
                    if "text" not in output_modalities:
                        continue
                    chat_models.append(model_id)

                # Ordena priorizando modelos estáveis conhecidos para geração de SQL/Chat
                priority_order = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b", "allam-2-7b"]
                sorted_models = [m for m in priority_order if m in chat_models]
                for m in chat_models:
                    if m not in sorted_models:
                        sorted_models.append(m)

                return sorted_models or [m.get("id") for m in raw_items if "id" in m]
            else:
                raise ValueError(f"Falha ao consultar modelos Groq: HTTP {resp.status_code}")


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
        if not model:
            raise ValueError("O parâmetro 'model' é obrigatório para o servidor local.")
        if not base_url:
            raise ValueError("A URL base ('base_url') é obrigatória para o servidor local.")

        resolved_key = api_key or "local-key-not-required"

        extra_body = kwargs.pop("extra_body", {})
        if "chat_template_kwargs" not in extra_body:
            extra_body["chat_template_kwargs"] = {"enable_thinking": False}

        return ChatOpenAI(
            model=model,
            api_key=resolved_key,
            base_url=base_url,
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
        if not base_url:
            return False, "URL base não informada para o servidor local."

        target_base = base_url.rstrip("/")
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

        return await super().fast_probe(
            base_url=base_url,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
        )

    async def list_models(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 5.0,
    ) -> list[str]:
        if not base_url:
            return []

        target_base = base_url.rstrip("/")
        endpoints = [f"{target_base}/models"]
        if not target_base.endswith("/v1"):
            endpoints.append(f"{target_base}/v1/models")

        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                for url in endpoints:
                    try:
                        resp = await client.get(url)
                        if resp.status_code == 200:
                            data = resp.json()
                            models = [m["id"] for m in data.get("data", []) if "id" in m]
                            if models:
                                return models
                    except Exception:
                        continue
        except Exception:
            pass
        return []


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
        if not model:
            raise ValueError("O parâmetro 'model' é obrigatório para o OpenRouter.")
        if not api_key:
            raise ValueError("A chave de API ('api_key') é obrigatória para o OpenRouter.")

        resolved_base_url = base_url or "https://openrouter.ai/api/v1"

        default_headers = {
            "HTTP-Referer": "https://cinedata.analytics",
            "X-Title": "CineData Analytics Agent",
        }
        if "default_headers" in kwargs:
            default_headers.update(kwargs.pop("default_headers"))

        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=resolved_base_url,
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
        if not api_key:
            return []
        headers = {"Authorization": f"Bearer {api_key}"}
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            # 1. Valida explicitamente a credencial da conta no OpenRouter
            auth_resp = await client.get("https://openrouter.ai/api/v1/auth/key", headers=headers)
            if auth_resp.status_code in (401, 403):
                raise ValueError("Chave de API do OpenRouter inválida ou não autorizada.")
            if auth_resp.status_code != 200:
                raise ValueError(f"Falha de autenticação OpenRouter ({auth_resp.status_code}): {auth_resp.text[:100]}")

            # 2. Obtém a listagem de modelos
            resp = await client.get("https://openrouter.ai/api/v1/models", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                models = [m["id"] for m in data.get("data", []) if "id" in m]
                free_models = [m for m in models if ":free" in m]
                other_models = [m for m in models if ":free" not in m]
                return free_models + other_models[:40]
            elif resp.status_code in (401, 403):
                raise ValueError("Chave de API do OpenRouter não autorizada.")
            else:
                raise ValueError(f"Falha ao consultar modelos OpenRouter: HTTP {resp.status_code}")


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
                for m in data.get("models", []):
                    name = m.get("name", "")
                    if name.startswith("models/"):
                        name = name[7:]
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods and "gemini" in name:
                        models.append(name)
                return models
            else:
                raise ValueError(f"Falha ao consultar modelos Google: HTTP {resp.status_code}")
