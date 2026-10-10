from fastapi import APIRouter, Query

from app.features.chat.dependencies import ThreadsSvc
from app.features.chat.schemas import ThreadDetailDTO, ThreadSummaryDTO
from app.features.chat.threads_router_metadata import (
    DELETE_THREAD_DOC,
    GET_THREAD_DOC,
    LIST_THREADS_DOC,
)

router = APIRouter(prefix="/chat/threads", tags=["Threads & Histórico"])


@router.get(
    "",
    response_model=list[ThreadSummaryDTO],
    **LIST_THREADS_DOC.to_dict(),
)
async def list_threads_endpoint(
    service: ThreadsSvc,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ThreadSummaryDTO]:
    return await service.list_threads(limit=limit, offset=offset)


@router.get(
    "/{thread_id}",
    response_model=ThreadDetailDTO,
    **GET_THREAD_DOC.to_dict(),
)
async def get_thread_endpoint(
    thread_id: str,
    service: ThreadsSvc,
) -> ThreadDetailDTO:
    return await service.get_thread_detail(thread_id)


@router.delete(
    "/{thread_id}",
    **DELETE_THREAD_DOC.to_dict(),
)
async def delete_thread_endpoint(
    thread_id: str,
    service: ThreadsSvc,
) -> dict[str, bool]:
    await service.delete_thread(thread_id)
    return {"success": True}
