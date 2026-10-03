import asyncio
import contextlib
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.prompts.title_prompt import TITLE_GENERATION_PROMPT
from app.core.llm_factory import get_chat_model
from app.core.timer import ExecutionTimer
from app.features.chat.thread_repository import ThreadRepository

logger = logging.getLogger(__name__)


class TitleGeneratorSubroutine:
    """
    Sub-rotina assíncrona desacoplada para sintetizar concisamente o título da conversa
    no primeiro turno, salvando na persistência sem impactar a latência do stream principal.
    """

    _pending_tasks: set[asyncio.Task[Any]] = set()

    @classmethod
    def spawn(
        cls,
        thread_id: str,
        user_message: str,
        provider_config: Any,
        on_title_generated: Any | None = None,
    ) -> asyncio.Task[str | None]:
        task = asyncio.create_task(
            cls._generate_and_persist(thread_id, user_message, provider_config, on_title_generated)
        )
        cls._pending_tasks.add(task)
        task.add_done_callback(cls._pending_tasks.discard)
        return task

    @classmethod
    async def _generate_and_persist(
        cls,
        thread_id: str,
        user_message: str,
        provider_config: Any,
        on_title_generated: Any | None = None,
    ) -> str | None:
        timer = ExecutionTimer().start()
        try:
            llm = get_chat_model(
                provider=getattr(provider_config, "provider", None),
                model=getattr(provider_config, "model", None),
                api_key=getattr(provider_config, "api_key", None),
                base_url=getattr(provider_config, "base_url", None),
                timeout_seconds=15,
                temperature=0.2,
            )

            response = await llm.ainvoke([
                SystemMessage(content=TITLE_GENERATION_PROMPT),
                HumanMessage(content=f"Pergunta do usuário: {user_message}"),
            ])

            raw_title = str(response.content).strip().strip('"').strip("'")
            # Limita a 60 caracteres ou palavras concisas
            words = raw_title.split()
            title = " ".join(words[:6]) if len(words) > 6 else raw_title
            if not title:
                title = "Consulta Analítica"

            await ThreadRepository.update_thread_title(thread_id, title)
            logger.info(
                "Título gerado para thread %s: '%s' em %d ms",
                thread_id,
                title,
                timer.duration_ms_int,
            )

            if on_title_generated and callable(on_title_generated):
                try:
                    res = on_title_generated(thread_id, title)
                    if asyncio.iscoroutine(res):
                        await res
                except Exception as cb_err:
                    logger.warning("Erro no callback on_title_generated: %s", cb_err)

            return title

        except Exception as exc:
            logger.warning("Falha ao sintetizar título para thread %s: %s", thread_id, exc)
            fallback_title = "Consulta Analítica"
            with contextlib.suppress(Exception):
                await ThreadRepository.update_thread_title(thread_id, fallback_title)
            return fallback_title
