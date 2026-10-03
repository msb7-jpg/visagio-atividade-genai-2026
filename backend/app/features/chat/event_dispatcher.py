import json
import logging
from typing import Any

import sqlparse

from app.core.constants import AgentNode, SSEEventType, StepStatus
from app.features.chat.schemas import StreamErrorPayload

logger = logging.getLogger(__name__)

NODE_LABELS: dict[str, str] = {
    AgentNode.ROUTER: "Classificando intenção",
    AgentNode.SQL_GENERATOR: "Escrevendo consulta SQL",
    AgentNode.SQL_EXECUTOR: "Executando no cinerocket.db",
    AgentNode.SQL_CORRECTOR: "Auto-corrigindo consulta SQL",
    AgentNode.CHART_GENERATOR: "Avaliando visualização gráfica",
    AgentNode.SYNTHESIZER: "Formatando análise executiva",
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
        """
        Emite o handshake de inicialização de sessão com metadados de modelo e thread.

        Args:
            thread_id: Identificador da conversa no checkpointer.
            provider: Provedor de inferência ativo.
            model: Identificador do modelo ativo.

        Returns:
            Dicionário com 'event' e 'data' no formato esperado pelo SSE.
        """
        return {
            "event": SSEEventType.SESSION.value,
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
        """
        Emite sinal de conclusão bem-sucedida do ciclo de inferência do agente.

        Args:
            thread_id: Identificador da conversa concluída.

        Returns:
            Dicionário SSE formatado com evento 'done'.
        """
        return {
            "event": SSEEventType.DONE.value,
            "data": json.dumps({"status": "completed", "thread_id": thread_id}),
        }

    @classmethod
    def emit_title(cls, thread_id: str, title: str) -> dict[str, str]:
        """
        Emite evento de atualização assíncrona do título sintetizado da thread.

        Args:
            thread_id: Identificador da conversa.
            title: Título conciso gerado pela subrotina.

        Returns:
            Dicionário SSE formatado com evento 'title'.
        """
        return {
            "event": SSEEventType.TITLE.value,
            "data": json.dumps({"thread_id": thread_id, "title": title}, ensure_ascii=False),
        }

    @classmethod
    def emit_error(cls, error_data: StreamErrorPayload | dict[str, Any]) -> dict[str, str]:
        """
        Emite evento estruturado de erro fatal durante o processamento da thread.

        Args:
            error_data: Dicionário contendo error, error_code e message amigável.

        Returns:
            Dicionário SSE formatado com evento 'error'.
        """
        return {
            "event": SSEEventType.ERROR.value,
            "data": json.dumps(error_data, ensure_ascii=False),
        }

    @classmethod
    def dispatch_node_updates(
        cls,
        node_name: str,
        node_update: dict[str, Any],
        duration_ms: int,
    ) -> list[dict[str, str]]:
        """
        Traduz atualizações de estado emitidas por um nó LangGraph específico em eventos SSE.

        Args:
            node_name: Identificador do nó que concluiu execução.
            node_update: Dicionário com deltas parciais de estado emitidos pelo nó.
            duration_ms: Latência de execução do nó em milissegundos.

        Returns:
            Lista de dicionários formatados para despacho Server-Sent Events.
        """
        events: list[dict[str, str]] = []
        label = NODE_LABELS.get(node_name, node_name)

        # 1. Evento de conclusão de etapa (step_end)
        events.append({
            "event": SSEEventType.STEP_END.value,
            "data": json.dumps(
                {
                    "step": node_name,
                    "label": label,
                    "status": StepStatus.DONE.value,
                    "duration_ms": duration_ms,
                },
                ensure_ascii=False,
            ),
        })

        # 2. Emissão de raciocínio intermediário (thought)
        if node_update.get("thought"):
            events.append({
                "event": SSEEventType.THOUGHT.value,
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
                "event": SSEEventType.SQL.value,
                "data": json.dumps(
                    {"sql": formatted_sql, "raw": raw_sql}, ensure_ascii=False
                ),
            })

        # 4. Emissão de especificação de gráfico Chart.js
        if node_update.get("chart_spec"):
            events.append({
                "event": SSEEventType.CHART.value,
                "data": json.dumps(node_update["chart_spec"], ensure_ascii=False),
            })

        # 5. Emissão de dados brutos
        if node_update.get("query_result") is not None:
            events.append({
                "event": SSEEventType.DATA.value,
                "data": json.dumps(
                    {"rows": node_update["query_result"]}, ensure_ascii=False
                ),
            })

        # 6. Emissão do texto final do sintetizador
        if node_name == AgentNode.SYNTHESIZER and node_update.get("messages"):
            final_msg = node_update["messages"][-1]
            events.append({
                "event": SSEEventType.TOKEN.value,
                "data": json.dumps(
                    {"token": final_msg.content}, ensure_ascii=False
                ),
            })

        return events
