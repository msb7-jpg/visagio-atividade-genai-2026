"""
Módulo de fábrica e registro de estratégias para provedores de Large Language Models.
"""

from app.core.constants import SUPPORTED_PROVIDERS
from app.core.llm_factory.base import LLMProviderStrategy
from app.core.llm_factory.factory import get_chat_model, provider_registry
from app.core.llm_factory.registry import LLMProviderRegistry
from app.core.llm_factory.strategies import (
    GoogleGenAIProviderStrategy,
    GroqProviderStrategy,
    LocalOpenAIProviderStrategy,
    OpenRouterProviderStrategy,
)

__all__ = [
    "SUPPORTED_PROVIDERS",
    "GoogleGenAIProviderStrategy",
    "GroqProviderStrategy",
    "LLMProviderRegistry",
    "LLMProviderStrategy",
    "LocalOpenAIProviderStrategy",
    "OpenRouterProviderStrategy",
    "get_chat_model",
    "provider_registry",
]
