from typing import Annotated, Any, Literal

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from app.core.constants import QueryResultRow, SqlErrorCategory, StepStatus


class AgentStepInfo(TypedDict):
    """Informações de execução e profiling de cada nó do agente."""

    node: str
    status: StepStatus | Literal["pending", "active", "done", "error"]
    duration_ms: int | None
    label: str


class AgentState(TypedDict):
    """
    Estado do LangGraph para o CineData Analytics Agent.
    Utiliza o reducer add_messages para gerenciar o histórico conversacional de forma imutável.
    """

    messages: Annotated[list[BaseMessage], add_messages]
    route: Literal["sql", "rag", "hybrid", "direct"] | None
    thought: str | None
    generated_sql: str | None
    query_result: list[QueryResultRow] | None
    error_count: int
    last_error: str | None
    error_category: SqlErrorCategory | Literal["SECURITY_VIOLATION", "RECOVERABLE_SYNTAX", "UNSUPPORTED_REQUEST"] | None
    chart_spec: dict[str, Any] | None
    requires_chart: bool | None
    title: str | None
    steps: list[AgentStepInfo]


class AgentStateUpdate(TypedDict, total=False):
    """Atualização parcial retornada pelos nós do LangGraph."""

    messages: list[BaseMessage]
    route: Literal["sql", "rag", "hybrid", "direct"] | None
    thought: str | None
    generated_sql: str | None
    query_result: list[QueryResultRow] | None
    error_count: int
    last_error: str | None
    error_category: SqlErrorCategory | Literal["SECURITY_VIOLATION", "RECOVERABLE_SYNTAX", "UNSUPPORTED_REQUEST"] | None
    chart_spec: dict[str, Any] | None
    requires_chart: bool | None
    title: str | None
    steps: list[AgentStepInfo]
