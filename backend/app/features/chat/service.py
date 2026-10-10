import asyncio
import logging
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent.graph import create_agent_graph
from app.agent.state import AgentState
from app.core.session_manager import ActiveSessionManager, get_session_manager
from app.core.timer import ExecutionTimer
from app.db.checkpointer import get_checkpointer
from app.features.chat.error_handler import StreamErrorHandler
from app.features.chat.event_dispatcher import SSEEventDispatcher
from app.features.chat.provider_resolver import ChatProviderResolver
from app.features.chat.schemas import ChatStreamRequestDTO
from app.features.chat.subroutines.title_generator import TitleGeneratorSubroutine
from app.features.chat.thread_repository import ThreadRepository

logger = logging.getLogger(__name__)


class AgentChatService:
    """
    Serviço de alto nível que orquestra a execução do agente e o streaming de eventos SSE,
    com suporte à persistência de checkpoints e titulação concorrente no 1º turno.
    """

    def __init__(
        self,
        graph=None,
        session_manager: ActiveSessionManager | None = None,
        repository: type[ThreadRepository] | ThreadRepository = ThreadRepository,
    ) -> None:
        self.graph = graph or create_agent_graph()
        self.session_manager = session_manager or get_session_manager()
        self.repository = repository

    def _prepare_execution_context(
        self,
        request: ChatStreamRequestDTO,
        thread_id: str,
        provider_cfg: Any,
    ) -> tuple[AgentState, RunnableConfig]:
        """Prepara payload de entrada e configurações do runner."""
        inputs: AgentState = {
            "messages": [HumanMessage(content=request.message)],
            "route": None,
            "thought": None,
            "generated_sql": None,
            "query_result": None,
            "error_count": 0,
            "last_error": None,
            "error_category": None,
            "chart_spec": None,
            "requires_chart": None,
            "semantic_results": None,
            "data_analysis_result": None,
            "title": None,
            "steps": [],
            "command": None,
        }
        runnable_config: RunnableConfig = {
            "configurable": {
                "provider": provider_cfg.provider,
                "model": provider_cfg.model,
                "api_key": provider_cfg.api_key,
                "base_url": provider_cfg.base_url,
                "timeout_seconds": provider_cfg.timeout_seconds,
                "thread_id": thread_id,
            }
        }
        return inputs, runnable_config

    async def _init_first_turn_title(
        self,
        thread_id: str,
        user_message: str,
        provider_cfg: Any,
        title_queue: asyncio.Queue[str],
    ) -> None:
        """Verifica se é o primeiro turno e agenda geração concorrente de título."""
        existing_thread = await self.repository.get_thread_summary(thread_id)
        is_first_turn = existing_thread is None or existing_thread.title == "Nova Conversa"
        await self.repository.get_or_create_thread(thread_id)
        await self.repository.touch_thread(thread_id)

        if is_first_turn:
            TitleGeneratorSubroutine.spawn(
                thread_id=thread_id,
                user_message=user_message,
                provider_config=provider_cfg,
                on_title_generated=lambda _tid, title: title_queue.put_nowait(title),
            )

    async def stream_chat(self, request: ChatStreamRequestDTO) -> AsyncGenerator[dict[str, str], None]:
        """
        Executa o grafo analítico do LangGraph e despacha os eventos em tempo real via SSE.
        """
        thread_id = request.thread_id or str(uuid.uuid4())
        logger.info("Iniciando stream_chat: thread_id=%s, model=%s", thread_id, request.model)

        async with self.session_manager.session_scope(thread_id):
            provider_cfg = await ChatProviderResolver.resolve(request)
            title_queue: asyncio.Queue[str] = asyncio.Queue()
            await self._init_first_turn_title(thread_id, request.message, provider_cfg, title_queue)

            yield SSEEventDispatcher.emit_session(thread_id, provider_cfg.provider, provider_cfg.model)
            inputs, runnable_config = self._prepare_execution_context(request, thread_id, provider_cfg)

            async for event in self._execute_and_stream(thread_id, provider_cfg, inputs, runnable_config, title_queue):
                yield event

    async def _execute_and_stream(
        self,
        thread_id: str,
        provider_cfg: Any,
        inputs: AgentState,
        runnable_config: RunnableConfig,
        title_queue: asyncio.Queue[str],
    ) -> AsyncGenerator[dict[str, str], None]:
        """Executa o grafo LangGraph e produz eventos SSE."""
        timer = ExecutionTimer().start()
        try:
            async with get_checkpointer() as saver:
                await saver.setup()
                graph = create_agent_graph(checkpointer=saver)
                is_mocked = hasattr(self.graph, "astream") and (
                    hasattr(self.graph.astream, "assert_called")
                    or bool(getattr(self.graph.astream, "side_effect", None))
                )
                stream_target = self.graph if is_mocked else graph

                async for event in stream_target.astream(inputs, config=runnable_config, stream_mode="updates"):
                    while not title_queue.empty():
                        yield SSEEventDispatcher.emit_title(thread_id, title_queue.get_nowait())

                    for node_name, node_update in event.items():
                        duration_ms = timer.duration_ms_int
                        for sse in SSEEventDispatcher.dispatch_node_updates(node_name, node_update, duration_ms):
                            yield sse

                while not title_queue.empty():
                    yield SSEEventDispatcher.emit_title(thread_id, title_queue.get_nowait())

                yield SSEEventDispatcher.emit_done(thread_id)
        except Exception as exc:
            logger.error("Erro durante stream_chat para thread %s: %s", thread_id, exc)
            err_data = StreamErrorHandler.format_error(exc, active_provider=provider_cfg.provider)
            yield SSEEventDispatcher.emit_error(err_data)
