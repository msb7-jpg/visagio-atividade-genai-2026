from typing import Annotated, Any, Literal

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from app.agent.embeddings.vector_store import MovieSearchResult
from app.core.constants import AgentNode, QueryResultRow, SqlErrorCategory, StepStatus


class AgentStepInfo(TypedDict):
    """Informações de execução e profiling de cada nó do agente."""

    node: str
    status: StepStatus | Literal["pending", "active", "done", "error"]
    duration_ms: int | None
    label: str


def append_steps(
    existing: list[AgentStepInfo] | None,
    new: list[AgentStepInfo] | AgentStepInfo | None,
) -> list[AgentStepInfo]:
    """
    Combina ou anexa etapas de execução do agente preservando a ordem cronológica.

    Ao encontrar a etapa 'router', sinaliza o início de uma nova rodada de processamento,
    reinicializando os passos do turno corrente.

    Args:
        existing: Lista pré-existente de etapas acumuladas no estado.
        new: Nova etapa ou lista de etapas retornada pelo nó concluído.

    Returns:
        Lista consolidada de AgentStepInfo atualizada para o estado.
    """
    if not new:
        return list(existing or [])

    new_items: list[AgentStepInfo] = [new] if isinstance(new, dict) else list(new)

    # Início de um novo turno conversacional: reinicializa a lista deste turno
    if any(step_info.get("node") == AgentNode.ROUTER.value for step_info in new_items):
        return list(new_items)

    current = list(existing or [])
    for item in new_items:
        current = [step_info for step_info in current if step_info.get("node") != item.get("node")]
        current.append(item)
    return current


def append_thought(existing: str | None, new: str | None) -> str | None:
    """
    Concatena raciocínios intermediários gerados por diferentes etapas do pipeline analítico.

    Preserva pensamentos úteis de etapas prévias (RAG, SQL, Correção, Sandbox)
    evitando sobrescrita indesejada do contexto reflexivo do agente.

    Args:
        existing: Cadeia de pensamentos acumulada até a etapa anterior.
        new: Novo bloco de raciocínio retornado pelo nó corrente.

    Returns:
        String consolidada com os pensamentos de cada etapa concatenados ou None.
    """
    if not new:
        return existing

    if new.startswith("__RESET__"):
        clean = new.replace("__RESET__", "").strip()
        return clean or None

    if not existing:
        return new

    if new in existing:
        return existing

    return f"{existing}\n\n{new}"


RouteType = Literal["sql", "rag", "hybrid", "direct"]


class SlashCommandInfo(TypedDict, total=False):
    """Metadados de comando de barra capturado na mensagem do usuário."""

    name: str
    args: str | None


class AgentState(TypedDict):
    """
    Estado do LangGraph para o CineData Analytics Agent.
    Utiliza o reducer add_messages para gerenciar o histórico conversacional de forma imutável.
    """

    messages: Annotated[list[BaseMessage], add_messages]
    route: RouteType | None
    thought: Annotated[str | None, append_thought]
    generated_sql: str | None
    query_result: list[QueryResultRow] | None
    error_count: int
    last_error: str | None
    error_category: SqlErrorCategory | Literal["SECURITY_VIOLATION", "RECOVERABLE_SYNTAX", "UNSUPPORTED_REQUEST"] | None
    chart_spec: dict[str, Any] | None
    requires_chart: bool | None
    semantic_results: list[MovieSearchResult] | list[dict[str, Any]] | None
    data_analysis_result: str | None
    title: str | None
    steps: Annotated[list[AgentStepInfo], append_steps]
    command: SlashCommandInfo | None


class AgentStateUpdate(TypedDict, total=False):
    """Atualização parcial retornada pelos nós do LangGraph."""

    messages: list[BaseMessage]
    route: RouteType | None
    thought: str | None
    generated_sql: str | None
    query_result: list[QueryResultRow] | None
    error_count: int
    last_error: str | None
    error_category: SqlErrorCategory | Literal["SECURITY_VIOLATION", "RECOVERABLE_SYNTAX", "UNSUPPORTED_REQUEST"] | None
    chart_spec: dict[str, Any] | None
    requires_chart: bool | None
    semantic_results: list[MovieSearchResult] | list[dict[str, Any]] | None
    data_analysis_result: str | None
    title: str | None
    steps: list[AgentStepInfo]
    command: SlashCommandInfo | None
