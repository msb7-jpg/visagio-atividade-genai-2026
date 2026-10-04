import logging
from typing import Any, Literal

from app.agent.graph import create_agent_graph
from app.core.session_manager import get_session_manager
from app.db.checkpointer import get_checkpointer
from app.features.chat.schemas import StepEventDTO, ThreadDetailDTO, ThreadMessageDTO, ThreadSummaryDTO
from app.features.chat.thread_repository import ThreadRepository

logger = logging.getLogger(__name__)


class ThreadsService:
    """
    Serviço que gerencia operações de leitura, recuperação e exclusão de threads de conversa.
    """

    @classmethod
    async def list_threads(cls, limit: int = 50, offset: int = 0) -> list[ThreadSummaryDTO]:
        """
        Lista resumos paginados de conversas salvas no SQLite.

        Args:
            limit: Quantidade máxima de registros a retornar.
            offset: Quantidade de registros a pular para paginação.

        Returns:
            Lista de ThreadSummaryDTO com títulos e timestamps.
        """
        return await ThreadRepository.list_threads(limit=limit, offset=offset)

    @classmethod
    async def get_thread_detail(cls, thread_id: str) -> ThreadDetailDTO | None:
        """
        Recupera os detalhes completos de uma thread, incluindo mensagens persistidas pelo checkpointer.

        Args:
            thread_id: Identificador único da conversa.

        Returns:
            ThreadDetailDTO estruturado caso a thread exista, ou None se não for encontrada.
        """
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
        """
        Remove permanentemente uma conversa e seu histórico associado.

        Args:
            thread_id: Identificador da conversa a ser excluída.

        Returns:
            True se a conversa foi removida com sucesso, False caso contrário.
        """
        return await ThreadRepository.delete_thread(thread_id)

    @classmethod
    async def _load_thread_messages(cls, thread_id: str, is_running: bool = False) -> list[ThreadMessageDTO]:
        """
        Lê e deserializa as mensagens gravadas no checkpointer do LangGraph.

        Args:
            thread_id: Identificador da sessão.
            is_running: Indica se a sessão ainda está em execução ativa no momento.

        Returns:
            Lista ordenada de ThreadMessageDTO representando o histórico da conversa.
        """
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

        # Se a última mensagem for do usuário e não houver execução ativa,
        # o assistente foi interrompido antes da conclusão
        if not is_running and formatted_messages and formatted_messages[-1].role == "user":
            raw_steps = state.values.get("steps") or []
            interrupted_steps: list[StepEventDTO] = [
                StepEventDTO(
                    step=s.get("step", s.get("node", "")),
                    label=s.get("label", s.get("node", "")),
                    status=s.get("status", "done"),
                    duration_ms=s.get("duration_ms"),
                )
                for s in raw_steps
            ]
            interrupted_steps.append(
                StepEventDTO(
                    step="interrupted",
                    label="Processamento interrompido",
                    status="error",
                )
            )

            raw_thought = state.values.get("thought")
            clean_thought = str(raw_thought).replace("__RESET__", "").strip() if raw_thought else None

            formatted_messages.append(
                ThreadMessageDTO(
                    id=f"interrupted-{thread_id}-{len(formatted_messages)}",
                    role="assistant",
                    content="",
                    type="ai",
                    thought=clean_thought,
                    generated_sql=state.values.get("generated_sql"),
                    chart_spec=state.values.get("chart_spec"),
                    steps=interrupted_steps,
                )
            )

        return formatted_messages

    @staticmethod
    def _format_message(
        msg: Any,
        thread_id: str,
        idx: int,
        is_last: bool,
        state_values: dict[str, Any],
    ) -> ThreadMessageDTO:
        """
        Converte uma mensagem crua do LangGraph / BaseMessage em um DTO tipado.

        Args:
            msg: Objeto BaseMessage ou similar recuperado do checkpoint.
            thread_id: Identificador da thread para geração do ID composto.
            idx: Índice posicional da mensagem no histórico.
            is_last: Flag indicando se é a última mensagem do estado.
            state_values: Dicionário completo de valores do estado no checkpoint.

        Returns:
            Instância de ThreadMessageDTO devidamente preenchida.
        """
        msg_type = getattr(msg, "type", "human")
        role: Literal["user", "assistant"] = "user" if msg_type in ("human", "user") else "assistant"

        thought: str | None = None
        generated_sql: str | None = None
        chart_spec: Any = None
        steps: list[StepEventDTO] | None = None
        provider: str | None = None
        model: str | None = None

        if role == "assistant":
            extra = getattr(msg, "additional_kwargs", {}) or {}
            raw_thought = extra.get("thought") or (state_values.get("thought") if is_last else None)
            thought = str(raw_thought).replace("__RESET__", "").strip() if raw_thought else None
            generated_sql = extra.get("generated_sql") or (state_values.get("generated_sql") if is_last else None)
            chart_spec = extra.get("chart_spec") or (state_values.get("chart_spec") if is_last else None)
            raw_steps = extra.get("steps") or (state_values.get("steps") if is_last else None)
            provider = extra.get("provider")
            model = extra.get("model")
            if raw_steps:
                steps = [
                    StepEventDTO(
                        step=s.get("step", s.get("node", "")),
                        label=s.get("label", s.get("node", "")),
                        status=s.get("status", "done"),
                        duration_ms=s.get("duration_ms"),
                    )
                    for s in raw_steps
                ]
            else:
                steps = []

        return ThreadMessageDTO(
            id=f"persisted-{thread_id}-{idx}",
            role=role,
            content=getattr(msg, "content", ""),
            type=msg_type,
            thought=thought,
            generated_sql=generated_sql,
            chart_spec=chart_spec,
            steps=steps,
            provider=provider,
            model=model,
        )
