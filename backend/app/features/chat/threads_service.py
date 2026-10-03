import contextlib
import logging
from typing import Any

from app.agent.graph import create_agent_graph
from app.db.checkpointer import get_checkpointer
from app.features.chat.schemas import ThreadDetailDTO, ThreadSummaryDTO
from app.features.chat.thread_repository import ThreadRepository

logger = logging.getLogger(__name__)


class ThreadsService:
    """
    Serviço que gerencia operações de leitura, recuperação e exclusão de threads de conversa.
    """

    @classmethod
    async def list_threads(cls, limit: int = 50, offset: int = 0) -> list[ThreadSummaryDTO]:
        return await ThreadRepository.list_threads(limit=limit, offset=offset)

    @classmethod
    async def get_thread_detail(cls, thread_id: str) -> ThreadDetailDTO | None:
        summary = await ThreadRepository.get_thread_summary(thread_id)
        if not summary:
            return None

        messages: list[dict[str, Any]] = []
        with contextlib.suppress(Exception):
            async with get_checkpointer() as saver:
                graph = create_agent_graph(checkpointer=saver)
                state = await graph.aget_state({"configurable": {"thread_id": thread_id}})
                if state and state.values:
                    raw_messages = state.values.get("messages", [])
                    for idx, msg in enumerate(raw_messages):
                        msg_type = getattr(msg, "type", "human")
                        role = "user" if msg_type in ("human", "user") else "assistant"
                        content = getattr(msg, "content", "")
                        messages.append({
                            "id": f"persisted-{thread_id}-{idx}",
                            "role": role,
                            "content": content,
                            "type": msg_type,
                        })

        return ThreadDetailDTO(
            thread_id=summary.thread_id,
            title=summary.title,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            messages=messages,
        )

    @classmethod
    async def delete_thread(cls, thread_id: str) -> bool:
        return await ThreadRepository.delete_thread(thread_id)
