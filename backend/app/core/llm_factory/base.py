from abc import ABC, abstractmethod
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage


class LLMProviderStrategy(ABC):
    """Contrato base para estratégias de instanciação e descoberta de provedores de LLM."""

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
        """
        Instancia e retorna o modelo de chat configurado.

        Args:
            model: Identificador do modelo no provedor (ex: 'llama-3.3-70b-versatile').
            api_key: Chave de API secreta, se exigida pelo provedor.
            base_url: Endpoint base HTTP customizado para o provedor.
            temperature: Grau de aleatoriedade das respostas (padrão: 0.0 para determinismo).
            timeout_seconds: Limite de tempo em segundos para requisições.
            **kwargs: Parâmetros adicionais específicos do modelo/SDK.

        Returns:
            Instância configurada de BaseChatModel pronta para invocação ou streaming.

        Raises:
            ValueError: Se os parâmetros mínimos exigidos não forem fornecidos.
            ProviderUnavailableError: Se o provedor não estiver configurado corretamente.
        """

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
        - Se responder com sucesso, retorna (True, 'Ping bem-sucedido').
        - Subclasses (como LocalOpenAIProviderStrategy) podem sobrescrever para
          verificações HTTP ainda mais rápidas (ex: /health sem inferência).

        Args:
            base_url: Endpoint base a ser sondado.
            api_key: Chave de API para autenticação no health check.
            timeout_seconds: Tempo limite da requisição rápida.

        Returns:
            Tupla contendo (is_healthy, status_message).
        """
        model = self.create_model(
            api_key=api_key,
            base_url=base_url,
            timeout_seconds=int(timeout_seconds),
        )
        await model.ainvoke([HumanMessage(content="ping")])
        return True, "Ping bem-sucedido"

    async def list_models(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 5.0,
    ) -> list[str]:
        """
        Consulta dinamicamente a API do provedor e retorna a lista de IDs de modelos disponíveis.

        Args:
            api_key: Chave de API para autenticação na listagem.
            base_url: Endpoint base do provedor.
            timeout_seconds: Tempo limite da requisição de catálogo.

        Returns:
            Lista ordenada com nomes ou identificadores de modelos.
        """
        return []
