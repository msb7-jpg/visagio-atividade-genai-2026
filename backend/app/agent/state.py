from typing import Annotated, Any, Literal

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """
    Estado do LangGraph para o CineData Analytics Agent.
    Utiliza o reducer add_messages para gerenciar o histórico conversacional de forma imutável.
    """

    messages: Annotated[list[BaseMessage], add_messages]
    route: Literal["sql", "rag", "hybrid", "direct"] | None
    generated_sql: str | None
    query_result: list[dict[str, Any]] | None
    error_count: int
    title: str | None
