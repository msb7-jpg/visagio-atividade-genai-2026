from fastapi import APIRouter, HTTPException, Query, status

from app.features.chat.schemas import ThreadDetailDTO, ThreadSummaryDTO
from app.features.chat.threads_router_metadata import (
    DELETE_THREAD_DOC,
    GET_THREAD_DOC,
    LIST_THREADS_DOC,
)
from app.features.chat.threads_service import ThreadsService

router = APIRouter(prefix="/chat/threads", tags=["Threads & Histórico"])


@router.get(
    "",
    response_model=list[ThreadSummaryDTO],
    summary=LIST_THREADS_DOC.summary,
    description=LIST_THREADS_DOC.description,
    response_description=LIST_THREADS_DOC.response_description,
)
async def list_threads_endpoint(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ThreadSummaryDTO]:
    return await ThreadsService.list_threads(limit=limit, offset=offset)


@router.get(
    "/{thread_id}",
    response_model=ThreadDetailDTO,
    summary=GET_THREAD_DOC.summary,
    description=GET_THREAD_DOC.description,
    response_description=GET_THREAD_DOC.response_description,
)
async def get_thread_endpoint(thread_id: str) -> ThreadDetailDTO:
    thread = await ThreadsService.get_thread_detail(thread_id)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversa '{thread_id}' não encontrada.",
        )
    return thread


@router.delete(
    "/{thread_id}",
    summary=DELETE_THREAD_DOC.summary,
    description=DELETE_THREAD_DOC.description,
    response_description=DELETE_THREAD_DOC.response_description,
)
async def delete_thread_endpoint(thread_id: str) -> dict[str, bool]:
    deleted = await ThreadsService.delete_thread(thread_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversa '{thread_id}' não encontrada ou já removida.",
        )
    return {"success": True}
