from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.features.chat.dependencies import ChatSvc
from app.features.chat.router_metadata import STREAM_CHAT_DOC
from app.features.chat.schemas import ChatStreamRequestDTO

router = APIRouter(prefix="/chat", tags=["Chat & Agente"])


@router.post(
    "/stream",
    **STREAM_CHAT_DOC.to_dict(),
)
async def stream_chat_endpoint(
    request: ChatStreamRequestDTO,
    service: ChatSvc,
) -> EventSourceResponse:
    """
    Inicia a sessão de processamento analítico com resposta via Server-Sent Events.
    """
    event_generator = service.stream_chat(request)
    return EventSourceResponse(event_generator)
