from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph

from app.agent.nodes.chart_generator import chart_generator_node
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


async def router_node(
    state: AgentState, config: RunnableConfig | None = None
) -> dict[str, Any]:
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

    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.0,
    )
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


def should_generate_chart(state: AgentState) -> bool:
    """Verifica se o usuário solicitou gráfico ou representação visual."""
    messages = state.get("messages", [])
    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = str(msg.content).lower()
            break

    chart_keywords = [
        "gráfico",
        "grafico",
        "chart",
        "plot",
        "ranking visual",
        "em barras",
        "de barras",
        "pizza",
        "linhas",
        "distribuição visual",
        "visualização",
        "visualizacao",
    ]
    return any(keyword in last_user_message for keyword in chart_keywords)


def check_sql_execution(
    state: AgentState,
) -> Literal["sql_corrector", "chart_generator", "synthesizer"]:
    """
    Decide se o fluxo segue para o sintetizador, gerador de gráfico ou entra no loop de autocorreção.
    Se o erro decorrer de violação de segurança/política de permissões (SECURITY_VIOLATION ou UNSUPPORTED_REQUEST),
    o fluxo vai direto para o sintetizador explicar a restrição em vez de tentar auto-corrigir.
    """
    last_error = state.get("last_error")
    error_count = state.get("error_count", 0)
    error_cat = state.get("error_category")

    if not last_error:
        # Se a query foi bem-sucedida e retornou dados, passa pelo chart_generator
        # para avaliação semântica de visualização pelo agente
        if state.get("query_result"):
            return "chart_generator"
        return "synthesizer"

    # Verificação canônica baseada na categoria tipada do erro
    if error_cat in ("SECURITY_VIOLATION", "UNSUPPORTED_REQUEST"):
        return "synthesizer"

    # Fallback defensivo caso a categoria não tenha sido preenchida explicitamente
    error_lower = last_error.lower()
    is_security_or_forbidden = (
        "política de segurança" in error_lower
        or "comando proibido" in error_lower
        or "acesso proibido" in error_lower
        or "declaração não autorizada" in error_lower
        or "tipo de instrução não permitida" in error_lower
        or "não foi possível gerar consulta sql para este pedido" in error_lower
    )
    if is_security_or_forbidden:
        return "synthesizer"

    if error_count < 3:
        return "sql_corrector"
    return "synthesizer"


def create_agent_graph(checkpointer: Any = None):
    """
    Compila o StateGraph com suporte opcional a checkpointer para persistência de threads.
    """
    workflow = StateGraph(AgentState)

    # Registro dos nós
    workflow.add_node("router", router_node)
    workflow.add_node("sql_generator", sql_generator_node)
    workflow.add_node("sql_executor", sql_executor_node)
    workflow.add_node("sql_corrector", sql_corrector_node)
    workflow.add_node("chart_generator", chart_generator_node)
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
            "chart_generator": "chart_generator",
            "synthesizer": "synthesizer",
        },
    )

    workflow.add_edge("chart_generator", "synthesizer")
    workflow.add_edge("sql_corrector", "sql_executor")
    workflow.add_edge("synthesizer", END)

    return workflow.compile(checkpointer=checkpointer)
