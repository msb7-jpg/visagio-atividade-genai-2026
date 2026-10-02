from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.features.chat.router_metadata import STREAM_CHAT_DOC
from app.features.chat.schemas import ChatStreamRequestDTO
from app.features.chat.service import AgentChatService

router = APIRouter(prefix="/chat", tags=["Chat & Agente"])
agent_service = AgentChatService()


@router.post(
    "/stream",
    summary=STREAM_CHAT_DOC.summary,
    description=STREAM_CHAT_DOC.description,
    response_description=STREAM_CHAT_DOC.response_description,
)
async def stream_chat_endpoint(request: ChatStreamRequestDTO) -> EventSourceResponse:
    """
    Inicia a sessão de processamento analítico com resposta via Server-Sent Events.
    """
    event_generator = agent_service.stream_chat(request)
    return EventSourceResponse(event_generator)
