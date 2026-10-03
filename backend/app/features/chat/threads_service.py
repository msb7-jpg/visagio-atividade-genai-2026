import logging
from typing import Any

from app.agent.graph import create_agent_graph
from app.core.session_manager import get_session_manager
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

        is_running = await get_session_manager().is_session_active(thread_id)
        messages = await cls._load_thread_messages(thread_id, is_running=is_running)

        return ThreadDetailDTO(
            thread_id=summary.thread_id,
            title=summary.title,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            messages=messages,
            is_running=is_running,
        )

    @classmethod
    async def delete_thread(cls, thread_id: str) -> bool:
        return await ThreadRepository.delete_thread(thread_id)


    @classmethod
    async def _load_thread_messages(cls, thread_id: str, is_running: bool = False) -> list[dict[str, Any]]:
        try:
            async with get_checkpointer() as saver:
                graph = create_agent_graph(checkpointer=saver)
                state = await graph.aget_state({"configurable": {"thread_id": thread_id}})
        except Exception:
            logger.warning("Falha ao recuperar o estado do checkpointer para a thread %s", thread_id, exc_info=True)
            return []

        if not state or not state.values:
            return []

        raw_messages = state.values.get("messages", [])
        total_messages = len(raw_messages)

        formatted_messages = [
            cls._format_message(
                msg=msg,
                thread_id=thread_id,
                idx=idx,
                is_last=(idx == total_messages - 1),
                state_values=state.values,
            )
            for idx, msg in enumerate(raw_messages)
        ]

        # Se a última mensagem for do usuário e não houver execução ativa, o assistente foi interrompido antes da conclusão
        if not is_running and formatted_messages and formatted_messages[-1].get("role") == "user":
            formatted_messages.append({
                "id": f"interrupted-{thread_id}-{len(formatted_messages)}",
                "role": "assistant",
                "content": "",
                "type": "ai",
                "steps": [
                    {
                        "step": "interrupted",
                        "label": "Processamento interrompido",
                        "status": "error",
                    }
                ],
            })

        return formatted_messages

    @staticmethod
    def _format_message(
        msg: Any,
        thread_id: str,
        idx: int,
        is_last: bool,
        state_values: dict[str, Any],
    ) -> dict[str, Any]:
        msg_type = getattr(msg, "type", "human")
        role = "user" if msg_type in ("human", "user") else "assistant"

        msg_data: dict[str, Any] = {
            "id": f"persisted-{thread_id}-{idx}",
            "role": role,
            "content": getattr(msg, "content", ""),
            "type": msg_type,
        }

        if role == "assistant":
            extra = getattr(msg, "additional_kwargs", {}) or {}
            
            # Campos adicionais passíveis de estarem nos kwargs ou no estado global da última mensagem
            tracked_fields = ("thought", "generated_sql", "chart_spec", "steps")
            for field in tracked_fields:
                value = extra.get(field) or (state_values.get(field) if is_last else None)
                if value:
                    msg_data[field] = value

        return msg_data