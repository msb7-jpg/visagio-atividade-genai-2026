from app.core.llm_factory.base import LLMProviderStrategy


class LLMProviderRegistry:
    """
    Registro extensível de estratégias de provedores de LLM.
    Permite registrar novos provedores dinamicamente sem alterar o código existente (OCP).
    """

    def __init__(self):
        self._strategies: dict[str, LLMProviderStrategy] = {}

    def register(self, provider_name: str, strategy: LLMProviderStrategy) -> None:
        self._strategies[provider_name.strip().lower()] = strategy

    def get(self, provider_name: str) -> LLMProviderStrategy:
        normalized = provider_name.strip().lower()
        if normalized not in self._strategies:
            valid_options = ", ".join(sorted(self._strategies.keys()))
            raise ValueError(f"Provedor '{provider_name}' não suportado. Opções válidas: {valid_options}")
        return self._strategies[normalized]

    def is_registered(self, provider_name: str) -> bool:
        return provider_name.strip().lower() in self._strategies
