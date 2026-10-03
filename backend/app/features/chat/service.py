import logging
import time
import uuid
from collections.abc import AsyncGenerator

from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent.graph import create_agent_graph
from app.core.session_manager import get_session_manager
from app.core.timer import ExecutionTimer
from app.features.chat.error_handler import StreamErrorHandler
from app.features.chat.event_dispatcher import SSEEventDispatcher
from app.features.chat.provider_resolver import ChatProviderResolver
from app.features.chat.schemas import ChatStreamRequestDTO

logger = logging.getLogger(__name__)


class AgentChatService:
    """
    Serviço de alto nível que orquestra a execução do agente e o streaming de eventos SSE.
    Desacoplado de formatação de erros, resolução de provedores e serialização de eventos.
    """

    def __init__(self):
        self.graph = create_agent_graph()

    async def stream_chat(
        self, request: ChatStreamRequestDTO
    ) -> AsyncGenerator[dict[str, str], None]:
        thread_id = request.thread_id or str(uuid.uuid4())
        session_manager = get_session_manager()
        await session_manager.register_session(thread_id)

        # 1. Resolve provedor e credenciais (SRP)
        provider_cfg = await ChatProviderResolver.resolve(request)

        inputs = {
            "messages": [HumanMessage(content=request.message)],
            "route": None,
            "thought": None,
            "generated_sql": None,
            "query_result": None,
            "error_count": 0,
            "last_error": None,
            "title": None,
            "steps": [],
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

        # 2. Emite handshake da sessão
        yield SSEEventDispatcher.emit_session(
            thread_id, provider_cfg.provider, provider_cfg.model
        )

        timer = ExecutionTimer().start()

        try:
            # 3. Itera pelas atualizações de cada nó do LangGraph
            async for event in self.graph.astream(
                inputs, config=runnable_config, stream_mode="updates"
            ):
                for node_name, node_update in event.items():
                    duration_ms = timer.duration_ms_int
                    mapped_events = SSEEventDispatcher.dispatch_node_updates(
                        node_name, node_update, duration_ms
                    )
                    for sse_event in mapped_events:
                        yield sse_event

            # 4. Finalização com sucesso
            yield SSEEventDispatcher.emit_done(thread_id)

        except Exception as exc:
            logger.error("Erro durante stream_chat para thread %s: %s", thread_id, exc)
            err_data = StreamErrorHandler.format_error(
                exc, active_provider=provider_cfg.provider
            )
            yield SSEEventDispatcher.emit_error(err_data)
        finally:
            await session_manager.unregister_session(thread_id)
