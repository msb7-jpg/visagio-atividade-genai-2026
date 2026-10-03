import json
import logging
from typing import Any

import sqlparse

logger = logging.getLogger(__name__)

NODE_LABELS: dict[str, str] = {
    "router": "Classificando intenção",
    "sql_generator": "Escrevendo consulta SQL",
    "sql_executor": "Executando no cinerocket.db",
    "sql_corrector": "Auto-corrigindo consulta SQL",
    "chart_generator": "Avaliando visualização gráfica",
    "synthesizer": "Formatando análise executiva",
}


class SSEEventDispatcher:
    """
    Traduz as atualizações emitidas pelos nós do LangGraph em eventos SSE formatados.
    Respeita SRP e OCP, permitindo novos mappings sem poluir o serviço central.
    """

    @classmethod
    def emit_session(
        cls, thread_id: str, provider: str | None, model: str | None
    ) -> dict[str, str]:
        return {
            "event": "session",
            "data": json.dumps(
                {
                    "thread_id": thread_id,
                    "provider": provider,
                    "model": model,
                },
                ensure_ascii=False,
            ),
        }

    @classmethod
    def emit_done(cls, thread_id: str) -> dict[str, str]:
        return {
            "event": "done",
            "data": json.dumps({"status": "completed", "thread_id": thread_id}),
        }

    @classmethod
    def emit_title(cls, thread_id: str, title: str) -> dict[str, str]:
        return {
            "event": "title",
            "data": json.dumps({"thread_id": thread_id, "title": title}, ensure_ascii=False),
        }

    @classmethod
    def emit_error(cls, error_data: dict[str, Any]) -> dict[str, str]:
        return {
            "event": "error",
            "data": json.dumps(error_data, ensure_ascii=False),
        }

    @classmethod
    def dispatch_node_updates(
        cls,
        node_name: str,
        node_update: dict[str, Any],
        duration_ms: int,
    ) -> list[dict[str, str]]:
        events: list[dict[str, str]] = []
        label = NODE_LABELS.get(node_name, node_name)

        # 1. Evento de conclusão de etapa (step_end)
        events.append({
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
        })

        # 2. Emissão de raciocínio intermediário (thought)
        if node_update.get("thought"):
            events.append({
                "event": "thought",
                "data": json.dumps(
                    {"thought": node_update["thought"]}, ensure_ascii=False
                ),
            })

        # 3. Emissão de código SQL formatado
        if node_update.get("generated_sql"):
            raw_sql = node_update["generated_sql"]
            formatted_sql = sqlparse.format(
                raw_sql, reindent=True, keyword_case="upper"
            )
            events.append({
                "event": "sql",
                "data": json.dumps(
                    {"sql": formatted_sql, "raw": raw_sql}, ensure_ascii=False
                ),
            })

        # 4. Emissão de especificação de gráfico Chart.js
        if node_update.get("chart_spec"):
            events.append({
                "event": "chart",
                "data": json.dumps(node_update["chart_spec"], ensure_ascii=False),
            })

        # 5. Emissão de dados brutos
        if node_update.get("query_result") is not None:
            events.append({
                "event": "data",
                "data": json.dumps(
                    {"rows": node_update["query_result"]}, ensure_ascii=False
                ),
            })

        # 6. Emissão do texto final do sintetizador
        if node_name == "synthesizer" and node_update.get("messages"):
            final_msg = node_update["messages"][-1]
            events.append({
                "event": "token",
                "data": json.dumps(
                    {"token": final_msg.content}, ensure_ascii=False
                ),
            })

        return events
