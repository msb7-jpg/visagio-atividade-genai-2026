from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from app.agent.nodes.corrector import sql_corrector_node
from app.agent.nodes.sql_executor import sql_executor_node
from app.agent.nodes.sql_generator import sql_generator_node
from app.agent.nodes.synthesizer import synthesizer_node
from app.agent.state import AgentState
from app.core.llm_factory import get_chat_model

ROUTER_PROMPT = """Você é o Classificador de Intenção do CineData Analytics.
Classifique a mensagem do usuário estritamente em uma das opções:
- "sql": perguntas sobre catálogo, filmes, diretores, atores, bilheteria, notas ou estatísticas.
- "direct": saudações, agradecimentos, perguntas sobre como o sistema funciona.

Responda unicamente com uma palavra: "sql" ou "direct".
"""


async def router_node(state: AgentState) -> dict[str, Any]:
    """
    Classifica a intenção do usuário para rotear para SQL ou Direct.
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

    llm = get_chat_model(temperature=0.0)
    response = await llm.ainvoke([
        SystemMessage(content=ROUTER_PROMPT),
        HumanMessage(content=last_user_message),
    ])

    decision = str(response.content).strip().lower()
    route: Literal["sql", "direct"] = "sql" if "sql" in decision else "direct"
    return {"route": route}


def route_decision(state: AgentState) -> Literal["sql_generator", "synthesizer"]:
    """Decisão após o roteamento."""
    if state.get("route") == "direct":
        return "synthesizer"
    return "sql_generator"


def check_sql_execution(state: AgentState) -> Literal["sql_corrector", "synthesizer"]:
    """
    Decide se o fluxo segue para o sintetizador ou entra no loop de autocorreção.
    """
    last_error = state.get("last_error")
    error_count = state.get("error_count", 0)

    if last_error and error_count < 3:
        return "sql_corrector"
    return "synthesizer"


def create_agent_graph():
    """
    Compila o StateGraph para o Slice 2: Text-to-SQL com Auto-recuperação.
    """
    workflow = StateGraph(AgentState)

    # Registro dos nós
    workflow.add_node("router", router_node)
    workflow.add_node("sql_generator", sql_generator_node)
    workflow.add_node("sql_executor", sql_executor_node)
    workflow.add_node("sql_corrector", sql_corrector_node)
    workflow.add_node("synthesizer", synthesizer_node)

    # Transições
    workflow.add_edge(START, "router")
    workflow.add_conditional_edges(
        "router",
        route_decision,
        {
            "sql_generator": "sql_generator",
            "synthesizer": "synthesizer",
        },
    )

    workflow.add_edge("sql_generator", "sql_executor")

    workflow.add_conditional_edges(
        "sql_executor",
        check_sql_execution,
        {
            "sql_corrector": "sql_corrector",
            "synthesizer": "synthesizer",
        },
    )

    workflow.add_edge("sql_corrector", "sql_executor")
    workflow.add_edge("synthesizer", END)

    return workflow.compile()
