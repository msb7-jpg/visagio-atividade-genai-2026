"""Nó classificador de intenções para roteamento dinâmico na FSM do LangGraph."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.state import AgentState, AgentStateUpdate, RouteType
from app.core.llm_factory import get_chat_model

logger = logging.getLogger(__name__)

ROUTER_PROMPT = """Você é o Classificador de Intenção do CineData Analytics.
Analise a mensagem mais recente do usuário e classifique-a estritamente em UMA das 4 categorias:

1. "direct": Saudações, despedidas, agradecimentos ou perguntas sobre como o sistema funciona.
2. "rag": Busca puramente conceitual, temática ou qualitativa em sinopses ou resenhas/opiniões
   (ex: "filmes sobre viagem no tempo", "resenhas que elogiam a reviravolta no final").
3. "hybrid": Perguntas conceituais combinadas com filtros analíticos de dados estruturados
   (ex: "filmes sobre inteligência artificial com faturamento acima de 100 milhões", "filmes com nota IMDb > 7.5").
4. "sql": Perguntas analíticas estruturadas diretas (rankings, bilheteria, receitas, notas, atores, diretores).

Responda unicamente com a palavra da categoria ("direct", "rag", "hybrid" ou "sql"), sem pontuação nem explicações.
"""


async def router_node(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
    """
    Classifica a intenção da mensagem do usuário para determinar a trilha executiva.

    Args:
        state: Estado atual contendo o histórico de mensagens.
        config: Configuração de execução contendo modelo e credenciais ativas.

    Returns:
        Atualização parcial do estado com 'route' em ('sql', 'rag', 'hybrid', 'direct').
    """
    messages = state.get("messages", [])
    if not messages:
        return {"route": "direct"}

    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = str(msg.content)
            break

    if not last_user_message:
        return {"route": "direct"}

    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.0,
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=ROUTER_PROMPT),
            HumanMessage(content=last_user_message),
        ])
        decision = str(response.content).strip().lower()
    except Exception as exc:
        logger.warning("Erro na classificação via LLM (%s). Fallback para heurística.", exc)
        decision = "sql"

    route: RouteType = "sql"

    if "direct" in decision:
        route = "direct"
    elif "hybrid" in decision:
        route = "hybrid"
    elif "rag" in decision:
        route = "rag"
    else:
        route = "sql"

    logger.info("Intenção classificada: %s (mensagem: '%s')", route, last_user_message[:60])
    return {"route": route}
