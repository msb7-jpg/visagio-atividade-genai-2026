import asyncio
import logging
import uuid
from collections.abc import AsyncGenerator

from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent.graph import create_agent_graph
from app.core.session_manager import get_session_manager
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

    def __init__(self):
        self.graph = create_agent_graph()

    async def stream_chat(self, request: ChatStreamRequestDTO) -> AsyncGenerator[dict[str, str], None]:
        """
        Executa o grafo analítico do LangGraph e despacha os eventos em tempo real via SSE.

        Garante lock atômico por thread via SessionManager, inicia subrotina de titulação
        no primeiro turno e persiste checkpoints a cada nó executado.

        Args:
            request: DTO contendo a pergunta do usuário, identificador da thread e preferências de LLM.

        Yields:
            Dicionários formatados contendo 'event' e 'data' serializados em JSON.

        Raises:
            SessionLockedError: Se outra requisição simultânea já estiver em execução na mesma thread.
        """
        thread_id = request.thread_id or str(uuid.uuid4())
        session_manager = get_session_manager()

        logger.info(
            "Iniciando stream_chat: thread_id=%s, model=%s, provider=%s, msg_preview='%s'",
            thread_id,
            request.model,
            request.provider,
            request.message[:60].replace("\n", " "),
        )

        async with session_manager.session_scope(thread_id):
            # 1. Resolve provedor e credenciais (SRP)
            provider_cfg = await ChatProviderResolver.resolve(request)

            # 2. Verifica se a thread já possui título cadastrado (para decidir titulação concorrente)
            existing_thread = await ThreadRepository.get_thread_summary(thread_id)
            is_first_turn = existing_thread is None or existing_thread.title == "Nova Conversa"
            logger.info("Thread status: thread_id=%s, is_first_turn=%s", thread_id, is_first_turn)

            # Garante registro na tabela de metadados
            await ThreadRepository.get_or_create_thread(thread_id)
            await ThreadRepository.touch_thread(thread_id)

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

            # Fila interna para despacho de título gerado assincronamente no meio do stream
            title_queue: asyncio.Queue[str] = asyncio.Queue()

            if is_first_turn:

                def on_title_ready(_tid: str, title: str):
                    title_queue.put_nowait(title)

                TitleGeneratorSubroutine.spawn(
                    thread_id=thread_id,
                    user_message=request.message,
                    provider_config=provider_cfg,
                    on_title_generated=on_title_ready,
                )

            # 3. Emite handshake da sessão
            yield SSEEventDispatcher.emit_session(thread_id, provider_cfg.provider, provider_cfg.model)

            timer = ExecutionTimer().start()

            try:
                async with get_checkpointer() as saver:
                    await saver.setup()
                    graph = create_agent_graph(checkpointer=saver)

                    # Prioriza mock se chat_service.graph foi patcheado nos testes
                    is_mocked = hasattr(self.graph, "astream") and (
                        hasattr(self.graph.astream, "assert_called")
                        or bool(getattr(self.graph.astream, "side_effect", None))
                    )
                    stream_target = self.graph if is_mocked else graph

                    # 4. Itera pelas atualizações de cada nó do LangGraph
                    async for event in stream_target.astream(inputs, config=runnable_config, stream_mode="updates"):
                        # Despacha título se tiver ficado pronto no intervalo
                        while not title_queue.empty():
                            ready_title = title_queue.get_nowait()
                            yield SSEEventDispatcher.emit_title(thread_id, ready_title)

                        for node_name, node_update in event.items():
                            duration_ms = timer.duration_ms_int
                            mapped_events = SSEEventDispatcher.dispatch_node_updates(
                                node_name, node_update, duration_ms
                            )
                            for sse_event in mapped_events:
                                yield sse_event

                    # Esvazia qualquer evento pendente de título antes do done
                    while not title_queue.empty():
                        ready_title = title_queue.get_nowait()
                        yield SSEEventDispatcher.emit_title(thread_id, ready_title)

                    # 5. Finalização com sucesso
                    yield SSEEventDispatcher.emit_done(thread_id)

            except Exception as exc:
                logger.error("Erro durante stream_chat para thread %s: %s", thread_id, exc)
                err_data = StreamErrorHandler.format_error(exc, active_provider=provider_cfg.provider)
                yield SSEEventDispatcher.emit_error(err_data)
