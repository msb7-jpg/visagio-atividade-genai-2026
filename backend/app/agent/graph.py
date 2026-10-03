from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph

from app.agent.nodes.chart_generator import chart_generator_node
from app.agent.nodes.corrector import sql_corrector_node
from app.agent.nodes.sql_executor import sql_executor_node
from app.agent.nodes.sql_generator import sql_generator_node
from app.agent.nodes.synthesizer import synthesizer_node
from app.agent.state import AgentState, AgentStateUpdate
from app.core.constants import AgentNode, SqlErrorCategory
from app.core.llm_factory import get_chat_model

ROUTER_PROMPT = """Você é o Classificador de Intenção do CineData Analytics.
Classifique a mensagem do usuário estritamente em uma das opções:
- "sql": perguntas sobre catálogo, filmes, diretores, atores, bilheteria, notas ou estatísticas.
- "direct": saudações, agradecimentos, perguntas sobre como o sistema funciona.

Responda unicamente com uma palavra: "sql" ou "direct".
"""


async def router_node(
    state: AgentState, config: RunnableConfig | None = None
) -> AgentStateUpdate:
    """
    Classifica a intenção da mensagem mais recente do usuário para definir a rota executiva.

    Args:
        state: Estado atual contendo o histórico de mensagens.
        config: Configurações de execução com credenciais e modelo ativos.

    Returns:
        Atualização parcial do estado com 'route' definido como 'sql' ou 'direct'.
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


def route_decision(state: AgentState) -> str:
    """
    Decide para qual nó direcionar a execução após a classificação inicial do roteador.

    Args:
        state: Estado atual contendo a chave 'route'.

    Returns:
        Nome do nó de destino: 'sql_generator' ou 'synthesizer'.
    """
    if state.get("route") == "direct":
        return AgentNode.SYNTHESIZER.value
    return AgentNode.SQL_GENERATOR.value


def should_generate_chart(state: AgentState) -> bool:
    """
    Avalia se a consulta do usuário contém intenção explícita de visualização gráfica.

    Args:
        state: Estado contendo o histórico de mensagens.

    Returns:
        True se termos de visualização forem identificados, False caso contrário.
    """
    messages = state.get("messages", [])
    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = str(msg.content).lower()
            break

    chart_keywords = (
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
    )
    return any(keyword in last_user_message for keyword in chart_keywords)


def check_sql_execution(state: AgentState) -> str:
    """
    Decide o próximo nó após a execução SQL (sucesso para gráfico/síntese ou loop de autocorreção).

    Se o erro for decorrente de violação de segurança ou instrução não suportada,
    o fluxo vai direto para o sintetizador explicar a restrição ao invés de tentar corrigir.

    Args:
        state: Estado contendo query_result, last_error e error_count.

    Returns:
        Identificador do nó de destino: 'sql_corrector', 'chart_generator' ou 'synthesizer'.
    """
    last_error = state.get("last_error")
    error_count = state.get("error_count", 0)
    error_cat = state.get("error_category")

    if not last_error:
        if state.get("query_result"):
            return AgentNode.CHART_GENERATOR.value
        return AgentNode.SYNTHESIZER.value

    if error_cat in (
        SqlErrorCategory.SECURITY_VIOLATION.value,
        SqlErrorCategory.UNSUPPORTED_REQUEST.value,
    ):
        return AgentNode.SYNTHESIZER.value

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
        return AgentNode.SYNTHESIZER.value

    if error_count < 3:
        return AgentNode.SQL_CORRECTOR.value
    return AgentNode.SYNTHESIZER.value


def create_agent_graph(checkpointer: Any = None):
    """
    Compila o StateGraph com suporte opcional a checkpointer para persistência de conversas.

    Args:
        checkpointer: Instância de checkpointer (ex: AsyncSqliteSaver) para salvar checkpoints.

    Returns:
        Grafo compilado pronto para ainvoke ou astream.
    """
    workflow = StateGraph(AgentState)

    # Registro dos nós
    workflow.add_node(AgentNode.ROUTER.value, router_node)
    workflow.add_node(AgentNode.SQL_GENERATOR.value, sql_generator_node)
    workflow.add_node(AgentNode.SQL_EXECUTOR.value, sql_executor_node)
    workflow.add_node(AgentNode.SQL_CORRECTOR.value, sql_corrector_node)
    workflow.add_node(AgentNode.CHART_GENERATOR.value, chart_generator_node)
    workflow.add_node(AgentNode.SYNTHESIZER.value, synthesizer_node)

    # Transições
    workflow.add_edge(START, AgentNode.ROUTER.value)
    workflow.add_conditional_edges(
        AgentNode.ROUTER.value,
        route_decision,
        {
            AgentNode.SQL_GENERATOR.value: AgentNode.SQL_GENERATOR.value,
            AgentNode.SYNTHESIZER.value: AgentNode.SYNTHESIZER.value,
        },
    )

    workflow.add_edge(AgentNode.SQL_GENERATOR.value, AgentNode.SQL_EXECUTOR.value)

    workflow.add_conditional_edges(
        AgentNode.SQL_EXECUTOR.value,
        check_sql_execution,
        {
            AgentNode.SQL_CORRECTOR.value: AgentNode.SQL_CORRECTOR.value,
            AgentNode.CHART_GENERATOR.value: AgentNode.CHART_GENERATOR.value,
            AgentNode.SYNTHESIZER.value: AgentNode.SYNTHESIZER.value,
        },
    )

    workflow.add_edge(AgentNode.CHART_GENERATOR.value, AgentNode.SYNTHESIZER.value)
    workflow.add_edge(AgentNode.SQL_CORRECTOR.value, AgentNode.SQL_EXECUTOR.value)
    workflow.add_edge(AgentNode.SYNTHESIZER.value, END)

    return workflow.compile(checkpointer=checkpointer)
