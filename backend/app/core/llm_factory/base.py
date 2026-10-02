from abc import ABC, abstractmethod
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage


class LLMProviderStrategy(ABC):
    """
    Interface abstrata para estratégias de instanciação e sondagem de LLMs.
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
        Executa sondagem rápida (health check).

        Estratégia padrão:
        - Instancia o modelo configurado via create_model.
        - Envia mensagem leve ('ping') e aguarda a resposta.
        - Se responder com sucesso, retorna (True, None).
        - Subclasses (como LocalOpenAIProviderStrategy) podem sobrescrever para
          verificações HTTP ainda mais rápidas (ex: /health ou /v1/health sem inferência).
        """
        model = self.create_model(
            api_key=api_key,
            base_url=base_url,
            timeout_seconds=int(timeout_seconds),
        )
        await model.ainvoke([HumanMessage(content="ping")])
        return True, "Ping bem-sucedido"
