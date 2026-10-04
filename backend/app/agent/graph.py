"""Orquestrador do Grafo de Execução do CineData Analytics via LangGraph."""

import inspect
import logging
import time
from collections.abc import Callable
from typing import Any

from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph

from app.agent.nodes.chart_generator import chart_generator_node
from app.agent.nodes.corrector import sql_corrector_node
from app.agent.nodes.data_analysis import data_analysis_node, should_run_data_analysis
from app.agent.nodes.router_node import router_node
from app.agent.nodes.semantic_rag import semantic_search_node
from app.agent.nodes.sql_executor import sql_executor_node
from app.agent.nodes.sql_generator import sql_generator_node
from app.agent.nodes.synthesizer import synthesizer_node
from app.agent.state import AgentState, AgentStateUpdate, AgentStepInfo, append_steps, append_thought
from app.core.constants import NODE_LABELS, AgentNode, SqlErrorCategory

logger = logging.getLogger(__name__)


def route_decision(state: AgentState) -> str:
    """
    Decide para qual nó direcionar a execução após a classificação inicial do roteador.

    Args:
        state: Estado atual contendo a chave 'route'.

    Returns:
        Identificador do próximo nó: 'semantic_search', 'sql_generator' ou 'synthesizer'.
    """
    route = state.get("route", "sql")
    if route == "direct":
        return AgentNode.SYNTHESIZER.value
    if route in ("rag", "hybrid"):
        return AgentNode.SEMANTIC_SEARCH.value
    return AgentNode.SQL_GENERATOR.value


def semantic_decision(state: AgentState) -> str:
    """
    Decide para onde convergir após a busca semântica vetorial (RAG puro ou Híbrido RAG+SQL).

    Args:
        state: Estado atual com 'route' e 'semantic_results'.

    Returns:
        'sql_generator' se for híbrido, ou 'synthesizer' se for RAG puramente qualitativo.
    """
    route = state.get("route")
    if route == "hybrid":
        return AgentNode.SQL_GENERATOR.value
    return AgentNode.SYNTHESIZER.value


def check_sql_execution(state: AgentState) -> str:
    """
    Decide o próximo nó após a execução SQL (sucesso para análise/gráfico ou loop de autocorreção).

    Args:
        state: Estado contendo query_result, last_error e error_count.

    Returns:
        Identificador do nó de destino: 'sql_corrector', 'data_analysis', 'chart_generator' ou 'synthesizer'.
    """
    last_error = state.get("last_error")
    error_count = state.get("error_count", 0)
    error_cat = state.get("error_category")

    if not last_error:
        # Sucesso na execução SQL
        if should_run_data_analysis(state):
            return AgentNode.DATA_ANALYSIS.value
        if state.get("query_result"):
            return AgentNode.CHART_GENERATOR.value
        return AgentNode.SYNTHESIZER.value

    # Recusas de segurança ou solicitações não suportadas vão direto para o sintetizador
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


def _format_thought_text(thought: Any, label: str, is_router: bool) -> str | None:
    """Formata o texto de pensamento com prefixo de etapa e marcador de reset se for router."""
    if not thought:
        return "__RESET__" if is_router else None

    t_str = str(thought).strip()
    if not t_str.startswith(f"[{label}]"):
        t_str = f"[{label}]\n{t_str}"

    return f"__RESET__{t_str}" if is_router else t_str


def _wrap_node(node_name: str, fn: Callable[..., Any]) -> Callable[..., Any]:
    """
    Encapsula nós do grafo injetando telemetria de latência e persistência de steps e thoughts.

    Args:
        node_name: Identificador canônico do nó do agente.
        fn: Função síncrona ou assíncrona do nó.

    Returns:
        Função envelopada compatível com a assinatura de nós do LangGraph.
    """
    label = NODE_LABELS.get(node_name, node_name)
    is_router = node_name == AgentNode.ROUTER.value

    if inspect.iscoroutinefunction(fn):

        async def async_wrapped(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
            t0 = time.perf_counter()
            res = await fn(state, config)
            duration_ms = max(1, int((time.perf_counter() - t0) * 1000))

            update: dict[str, Any] = dict(res or {})
            step_info: AgentStepInfo = {
                "node": node_name,
                "label": label,
                "status": "done",
                "duration_ms": duration_ms,
            }
            update["steps"] = [step_info]

            formatted_thought = _format_thought_text(update.get("thought"), label, is_router)
            if formatted_thought is not None:
                update["thought"] = formatted_thought

            if update.get("messages"):
                all_steps = append_steps(state.get("steps"), [step_info])
                all_thought = append_thought(state.get("thought"), update.get("thought"))
                for msg in update["messages"]:
                    if isinstance(msg, AIMessage):
                        msg.additional_kwargs["steps"] = all_steps
                        if all_thought:
                            msg.additional_kwargs["thought"] = all_thought

            return update  # type: ignore[return-value]

        return async_wrapped

    def sync_wrapped(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
        t0 = time.perf_counter()
        res = fn(state) if getattr(fn, "__code__", None) and fn.__code__.co_argcount == 1 else fn(state, config)
        duration_ms = max(1, int((time.perf_counter() - t0) * 1000))

        update: dict[str, Any] = dict(res or {})
        step_info: AgentStepInfo = {
            "node": node_name,
            "label": label,
            "status": "done",
            "duration_ms": duration_ms,
        }
        update["steps"] = [step_info]

        formatted_thought = _format_thought_text(update.get("thought"), label, is_router)
        if formatted_thought is not None:
            update["thought"] = formatted_thought

        return update  # type: ignore[return-value]

    return sync_wrapped


def create_agent_graph(checkpointer: Any = None):
    """
    Compila o StateGraph completo com suporte a rotas SQL, RAG, Híbrido, Math Sandbox e Charts.

    Args:
        checkpointer: Instância de checkpointer (ex: AsyncSqliteSaver) para salvar checkpoints.

    Returns:
        Grafo compilado pronto para execução assíncrona.
    """
    workflow = StateGraph(AgentState)

    # 1. Registro de todos os nós com rastreamento automático de etapas e telemetria
    nodes = [
        (AgentNode.ROUTER.value, router_node),
        (AgentNode.SEMANTIC_SEARCH.value, semantic_search_node),
        (AgentNode.SQL_GENERATOR.value, sql_generator_node),
        (AgentNode.SQL_EXECUTOR.value, sql_executor_node),
        (AgentNode.SQL_CORRECTOR.value, sql_corrector_node),
        (AgentNode.DATA_ANALYSIS.value, data_analysis_node),
        (AgentNode.CHART_GENERATOR.value, chart_generator_node),
        (AgentNode.SYNTHESIZER.value, synthesizer_node),
    ]
    for name, fn in nodes:
        workflow.add_node(name, _wrap_node(name, fn))

    # 2. Transição inicial: START -> ROUTER
    workflow.add_edge(START, AgentNode.ROUTER.value)

    # 3. Roteamento pós-classificador
    workflow.add_conditional_edges(
        AgentNode.ROUTER.value,
        route_decision,
        {
            AgentNode.SEMANTIC_SEARCH.value: AgentNode.SEMANTIC_SEARCH.value,
            AgentNode.SQL_GENERATOR.value: AgentNode.SQL_GENERATOR.value,
            AgentNode.SYNTHESIZER.value: AgentNode.SYNTHESIZER.value,
        },
    )

    # 4. Transição pós-busca semântica
    workflow.add_conditional_edges(
        AgentNode.SEMANTIC_SEARCH.value,
        semantic_decision,
        {
            AgentNode.SQL_GENERATOR.value: AgentNode.SQL_GENERATOR.value,
            AgentNode.SYNTHESIZER.value: AgentNode.SYNTHESIZER.value,
        },
    )

    # 5. Pipeline SQL: Gerador -> Executor
    workflow.add_edge(AgentNode.SQL_GENERATOR.value, AgentNode.SQL_EXECUTOR.value)

    # 6. Avaliação pós-execução SQL (Autocorreção, Sandbox, Gráfico ou Síntese)
    workflow.add_conditional_edges(
        AgentNode.SQL_EXECUTOR.value,
        check_sql_execution,
        {
            AgentNode.SQL_CORRECTOR.value: AgentNode.SQL_CORRECTOR.value,
            AgentNode.DATA_ANALYSIS.value: AgentNode.DATA_ANALYSIS.value,
            AgentNode.CHART_GENERATOR.value: AgentNode.CHART_GENERATOR.value,
            AgentNode.SYNTHESIZER.value: AgentNode.SYNTHESIZER.value,
        },
    )

    # 7. Loop de autocorreção: Corrector -> Executor
    workflow.add_edge(AgentNode.SQL_CORRECTOR.value, AgentNode.SQL_EXECUTOR.value)

    # 8. Pós sandbox matemática -> Gráfico (se aplicável)
    workflow.add_edge(AgentNode.DATA_ANALYSIS.value, AgentNode.CHART_GENERATOR.value)

    # 9. Pós gerador de gráficos -> Síntese final
    workflow.add_edge(AgentNode.CHART_GENERATOR.value, AgentNode.SYNTHESIZER.value)

    # 10. Conclusão: Synthesizer -> END
    workflow.add_edge(AgentNode.SYNTHESIZER.value, END)

    return workflow.compile(checkpointer=checkpointer)
