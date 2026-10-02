from typing import Any, Literal

from pydantic import BaseModel, Field

from app.features.settings.schemas import ProviderConfigDTO


class ChatStreamRequestDTO(BaseModel):
    """Payload para envio de mensagens com suporte a streaming SSE."""

    message: str = Field(..., min_length=1, description="Mensagem ou pergunta analítica do usuário")
    thread_id: str | None = Field(
        default=None, description="Identificador da sessão/thread para persistência"
    )
    provider: str | None = Field(
        default=None, description="Provedor selecionado na UI"
    )
    model: str | None = Field(
        default=None, description="Modelo selecionado na UI"
    )
    provider_override: ProviderConfigDTO | None = Field(
        default=None,
        description="Configuração de LLM personalizada opcional para esta requisição",
    )



class StepEventDTO(BaseModel):
    """Evento de início ou fim de nó do LangGraph."""

    step: str
    status: Literal["active", "done", "error"]
    label: str
    duration_ms: int | None = None


class StreamEventDTO(BaseModel):
    """Payload padronizado de eventos SSE despachados ao cliente."""

    type: Literal["step_start", "step_end", "thought", "sql", "token", "data", "error", "done"]
    data: Any
