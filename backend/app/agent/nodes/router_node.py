"""Nó classificador de intenções para roteamento dinâmico na FSM do LangGraph."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.prompts import ROUTER_PROMPT
from app.agent.state import AgentState, AgentStateUpdate, RouteType, SlashCommandInfo
from app.agent.utils.command_parser import parse_slash_command
from app.core.llm_factory import get_chat_model

logger = logging.getLogger(__name__)


def _resolve_command_route(command_info: SlashCommandInfo) -> AgentStateUpdate | None:
    """Resolve a rota imediata a partir de comando explícito ou None."""
    cmd_name = command_info["name"]
    logger.info("Slash command detectado no router: %s", cmd_name)
    if cmd_name == "chart":
        return {"route": "sql", "requires_chart": True, "command": command_info}
    if cmd_name in ("sql", "rag", "hybrid"):
        return {"route": cmd_name, "command": command_info}
    if cmd_name in ("direct", "explain"):
        return {"route": "direct", "command": command_info}
    return None


def _resolve_decision_route(decision: str) -> RouteType:
    """Mapeia a resposta textual do LLM para a rota correspondente."""
    if "direct" in decision:
        return "direct"
    if "hybrid" in decision:
        return "hybrid"
    if "rag" in decision:
        return "rag"
    return "sql"


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
        return {"route": "direct", "command": None}

    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = str(msg.content)
            break

    if not last_user_message:
        return {"route": "direct", "command": None}

    # Avalia se há comando de barra no início da mensagem
    command_info, _ = parse_slash_command(last_user_message)
    if command_info:
        route_update = _resolve_command_route(command_info)
        if route_update:
            return route_update

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

    route = _resolve_decision_route(decision)
    logger.info("Intenção classificada: %s (mensagem: '%s')", route, last_user_message[:60])
    return {"route": route, "command": None}
