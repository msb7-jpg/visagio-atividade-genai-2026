import json
import time
import uuid
from collections.abc import AsyncGenerator

import sqlparse
from langchain_core.messages import HumanMessage

from app.agent.graph import create_agent_graph
from app.features.chat.schemas import ChatStreamRequestDTO

NODE_LABELS = {
    "router": "Classificando intenção",
    "sql_generator": "Escrevendo consulta SQL",
    "sql_executor": "Executando no cinerocket.db",
    "sql_corrector": "Auto-corrigindo consulta SQL",
    "synthesizer": "Formatando análise executiva",
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

        # Aplica override efêmero do provedor se solicitado
        if request.provider_override:
            from app.features.settings.service import get_settings_service

            await get_settings_service().update_config(request.provider_override)

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

        # Notifica início da sessão/thread
        yield {
            "event": "session",
            "data": json.dumps({"thread_id": thread_id}, ensure_ascii=False),
        }

        start_time = time.perf_counter()

        try:
            # Itera assincronamente nó a nó pelo grafo compilado
            async for event in self.graph.astream(inputs, stream_mode="updates"):
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
            yield {
                "event": "error",
                "data": json.dumps({"error": str(exc)}, ensure_ascii=False),
            }
