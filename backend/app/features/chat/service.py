import json
import logging
import time
import uuid
from collections.abc import AsyncGenerator

import sqlparse
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent.graph import create_agent_graph
from app.core.session_manager import get_session_manager
from app.features.chat.schemas import ChatStreamRequestDTO

logger = logging.getLogger(__name__)

NODE_LABELS = {
    "router": "Classificando intenção",
    "sql_generator": "Escrevendo consulta SQL",
    "sql_executor": "Executando no cinerocket.db",
    "sql_corrector": "Auto-corrigindo consulta SQL",
    "synthesizer": "Formatando análise executiva",
}


def format_stream_error(exc: Exception, active_provider: str | None = None) -> dict[str, str]:
    """Categoriza e formata mensagens de erro para exibição amigável no chat."""
    raw_str = str(exc)
    error_lower = raw_str.lower()
    prov_name = active_provider.title() if active_provider else "IA"

    if "402" in error_lower or "resource_exhausted" in error_lower:
        return {
            "error": raw_str,
            "error_code": "RESOURCE_EXHAUSTED",
            "message": (
                f"Créditos ou cota da chave de API esgotados no provedor '{prov_name}' "
                "(402 Resource Exhausted). Acesse o painel de faturamento do provedor "
                "ou troque o provedor ativo nas configurações."
            ),
        }

    if (
        "401" in error_lower
        or "unauthorized" in error_lower
        or "invalid" in error_lower
        or "não autorizada" in error_lower
        or "403" in error_lower
    ):
        return {
            "error": raw_str,
            "error_code": "UNAUTHORIZED",
            "message": (
                f"Chave de API inválida ou não autorizada para o provedor '{prov_name}'. "
                "Verifique ou atualize suas credenciais no painel de configurações."
            ),
        }

    if (
        "connection refused" in error_lower
        or "connecterror" in error_lower
        or "failed to connect" in error_lower
    ):
        return {
            "error": raw_str,
            "error_code": "CONNECTION_REFUSED",
            "message": (
                f"Não foi possível conectar ao servidor do provedor '{prov_name}'. "
                "Verifique se o serviço local ou remoto está online e acessível."
            ),
        }

    if "timed out" in error_lower or "timeout" in error_lower:
        return {
            "error": raw_str,
            "error_code": "TIMEOUT",
            "message": (
                f"Tempo limite excedido ao aguardar resposta do provedor '{prov_name}'. "
                "O modelo pode estar sobrecarregado no momento."
            ),
        }

    return {
        "error": raw_str,
        "error_code": "AGENT_ERROR",
        "message": f"Ocorreu uma falha no processamento analítico: {raw_str[:200]}",
    }


class AgentChatService:
    """
    Serviço que orquestra a invocação do LangGraph e o streaming SSE de eventos estruturados.
    """

    def __init__(self):
        self.graph = create_agent_graph()

    async def stream_chat(
        self, request: ChatStreamRequestDTO
    ) -> AsyncGenerator[dict[str, str], None]:
        """
        Executa o grafo e emite eventos SSE tipados.
        """
        thread_id = request.thread_id or str(uuid.uuid4())
        session_manager = get_session_manager()
        await session_manager.register_session(thread_id)

        # 1. Resolve a configuração de IA a ser utilizada
        active_provider = None
        active_model = None
        active_key = None
        active_base_url = None
        active_timeout = 30

        if request.provider_override:
            from app.features.settings.service import get_settings_service

            saved = await get_settings_service().update_config(request.provider_override)
            active_provider = request.provider_override.provider
            active_model = request.provider_override.model
            active_key = request.provider_override.api_key
            active_base_url = request.provider_override.base_url
            active_timeout = request.provider_override.timeout_seconds
        elif request.provider and request.model:
            from app.db.settings_db import get_user_provider_config

            active_provider = request.provider
            active_model = request.model
            saved = await get_user_provider_config("default_user", request.provider)
            if saved:
                active_key = saved.get("api_key")
                active_base_url = saved.get("base_url")
                active_timeout = saved.get("timeout_seconds", 30)
        else:
            from app.db.settings_db import get_active_provider_config

            active = await get_active_provider_config("default_user")
            if active and active.get("provider") and active.get("model"):
                active_provider = active["provider"]
                active_model = active["model"]
                active_key = active.get("api_key")
                active_base_url = active.get("base_url")
                active_timeout = active.get("timeout_seconds", 30)

        if active_provider == "local" and not active_base_url:
            active_base_url = "http://localhost:1234/v1"

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
                "provider": active_provider,
                "model": active_model,
                "api_key": active_key,
                "base_url": active_base_url,
                "timeout_seconds": active_timeout,
                "thread_id": thread_id,
            }
        }

        # Notifica início da sessão/thread com o provedor e modelo reais
        yield {
            "event": "session",
            "data": json.dumps(
                {
                    "thread_id": thread_id,
                    "provider": active_provider,
                    "model": active_model,
                },
                ensure_ascii=False,
            ),
        }

        start_time = time.perf_counter()

        try:
            # Itera assincronamente nó a nó pelo grafo compilado
            async for event in self.graph.astream(
                inputs, config=runnable_config, stream_mode="updates"
            ):
                for node_name, node_update in event.items():
                    label = NODE_LABELS.get(node_name, node_name)
                    duration_ms = int((time.perf_counter() - start_time) * 1000)

                    # 1. Evento de conclusão de etapa (step_end)
                    yield {
                        "event": "step_end",
                        "data": json.dumps(
                            {
                                "step": node_name,
                                "label": label,
                                "status": "done",
                                "duration_ms": duration_ms,
                            },
                            ensure_ascii=False,
                        ),
                    }

                    # 2. Emissão de raciocínio intermediário (thought)
                    if node_update.get("thought"):
                        yield {
                            "event": "thought",
                            "data": json.dumps(
                                {"thought": node_update["thought"]}, ensure_ascii=False
                            ),
                        }

                    # 3. Emissão de código SQL formatado
                    if node_update.get("generated_sql"):
                        raw_sql = node_update["generated_sql"]
                        formatted_sql = sqlparse.format(
                            raw_sql, reindent=True, keyword_case="upper"
                        )
                        yield {
                            "event": "sql",
                            "data": json.dumps(
                                {"sql": formatted_sql, "raw": raw_sql}, ensure_ascii=False
                            ),
                        }

                    # 4. Emissão de dados brutos
                    if node_update.get("query_result") is not None:
                        yield {
                            "event": "data",
                            "data": json.dumps(
                                {"rows": node_update["query_result"]}, ensure_ascii=False
                            ),
                        }

                    # 5. Emissão do texto final do sintetizador
                    if node_name == "synthesizer" and node_update.get("messages"):
                        final_msg = node_update["messages"][-1]
                        yield {
                            "event": "token",
                            "data": json.dumps(
                                {"token": final_msg.content}, ensure_ascii=False
                            ),
                        }

            # Finalização com sucesso
            yield {
                "event": "done",
                "data": json.dumps({"status": "completed", "thread_id": thread_id}),
            }

        except Exception as exc:
            logger.error("Erro durante stream_chat para thread %s: %s", thread_id, exc)
            err_data = format_stream_error(exc, active_provider=active_provider)
            yield {
                "event": "error",
                "data": json.dumps(err_data, ensure_ascii=False),
            }
        finally:
            await session_manager.unregister_session(thread_id)
