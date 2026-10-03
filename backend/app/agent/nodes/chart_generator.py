import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.schemas.chart_schema import ChartDataset, ChartJsConfigDTO
from app.agent.state import AgentState, AgentStateUpdate
from app.core.constants import ChartType, QueryResultRow
from app.core.llm_factory import get_chat_model

logger = logging.getLogger(__name__)

CHART_DECISION_SYSTEM_PROMPT = """
Você é um especialista em visualização de dados corporativos e Business Intelligence.
Sua missão é avaliar se a resposta para a consulta analítica do usuário se beneficia de um gráfico visual.

DIRETRIZES DE DECISÃO:
1. Retorne SEMPRE um JSON válido estrito no seguinte formato:
   {
     "should_visualize": true | false,
     "chart": {
       "type": "bar" | "line" | "pie" | "doughnut",
       "title": "Título Claro e Conciso do Gráfico",
       "labels": ["Item 1", "Item 2"],
       "datasets": [
         {
           "label": "Métrica em R$ ou Qtd",
           "data": [10.5, 20.0]
         }
       ]
     }
   }
2. Se "should_visualize" for false, o campo "chart" pode ser null.
3. Se os dados forem séries temporais (anos/meses), use preferencialmente "line".
4. Se for proporção ou composição de poucas categorias (<= 7), use "pie" ou "doughnut".
5. Se for ranking ou comparação categórica, use "bar".
6. Nunca inclua cores, estilos ou Markdown no JSON. Apenas JSON puro.
"""


def _detect_chart_type(query_lower: str) -> ChartType:
    """Determina o tipo de gráfico baseado em palavras-chave na consulta."""
    if "linha" in query_lower or "temporal" in query_lower or "evolução" in query_lower:
        return ChartType.LINE
    if "rosca" in query_lower:
        return ChartType.DOUGHNUT
    if "pizza" in query_lower or "distribuição" in query_lower:
        return ChartType.PIE
    return ChartType.BAR


def _extract_columns(
    first_row: QueryResultRow, keys: list[str]
) -> tuple[str | None, str | None]:
    """Identifica heuristicamente colunas de rótulo e de métrica numérica."""
    label_col = None
    metric_col = None

    for k in keys:
        sample_val = first_row[k]
        if isinstance(sample_val, str) and label_col is None:
            label_col = k
        elif isinstance(sample_val, (int, float)) and metric_col is None:
            metric_col = k

    if not label_col and keys:
        label_col = keys[0]

    if not metric_col:
        for k in keys:
            if k != label_col and isinstance(first_row[k], (int, float)):
                metric_col = k
                break

    return label_col, metric_col


def _heuristic_chart_builder(
    user_query: str, query_result: list[QueryResultRow]
) -> dict[str, Any] | None:
    """
    Constrói a especificação do gráfico de forma determinística caso os dados sejam adequados.

    Args:
        user_query: Consulta original do usuário.
        query_result: Linhas retornadas pela execução da consulta SQL.

    Returns:
        Dicionário serializado da especificação do gráfico ou None caso os dados sejam insuficientes.
    """
    if not query_result or not isinstance(query_result, list):
        return None

    first_row = query_result[0]
    keys = list(first_row.keys())
    if len(keys) < 2:
        return None

    label_col, metric_col = _extract_columns(first_row, keys)
    if not label_col or not metric_col:
        return None

    labels = [str(row.get(label_col, "")) for row in query_result[:15]]
    data = [float(row.get(metric_col, 0) or 0) for row in query_result[:15]]

    chart_type = _detect_chart_type(user_query.lower())
    metric_name = metric_col.replace("_", " ").title()
    title = f"{metric_name} por {label_col.replace('_', ' ').title()}"

    dto = ChartJsConfigDTO(
        type=chart_type.value,
        title=title,
        labels=labels,
        datasets=[ChartDataset(label=metric_name, data=data)],
    )
    return dto.model_dump()


def check_explicit_chart_intent(query: str) -> bool:
    """
    Verifica se há intenção explícita de visualização gráfica no texto ou comando /chart.

    Args:
        query: Mensagem de texto enviada pelo usuário.

    Returns:
        True se houver intenção explícita detectada, False caso contrário.
    """
    q = query.lower()
    if "/chart" in q:
        return True
    keywords = (
        "gráfico",
        "grafico",
        "chart",
        "plot",
        "pizza",
        "doughnut",
        "em barras",
        "de barras",
        "linhas",
        "visualização",
        "visualizacao",
        "visualmente",
    )
    return any(k in q for k in keywords)


def _clean_markdown_code_block(raw_content: str) -> str:
    """Remove delimitadores markdown ```json de saídas do modelo."""
    content = raw_content.strip()
    if not content.startswith("```"):
        return content

    lines = content.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _resolve_chart_spec(
    parsed: dict[str, Any],
    explicit_intent: bool,
    last_user_query: str,
    query_result: list[QueryResultRow],
) -> dict[str, Any] | None:
    """Valida o payload parseado do LLM e aplica fallback heurístico se necessário."""
    if not parsed.get("should_visualize") and not explicit_intent:
        return None

    chart_data = parsed.get("chart")
    if not chart_data:
        if explicit_intent:
            return _heuristic_chart_builder(last_user_query, query_result)
        return None

    dto = ChartJsConfigDTO(**chart_data)
    return dto.model_dump()


async def chart_generator_node(
    state: AgentState, config: RunnableConfig | None = None
) -> AgentStateUpdate:
    """
    Nó do LangGraph responsável por avaliar se há intenção e valor em gerar gráfico
    e estruturar o ChartJsConfigDTO correspondente.

    Args:
        state: Estado atual do grafo do agente.
        config: Configuração opcional de execução com credenciais ativas do modelo.

    Returns:
        Atualização parcial do estado contendo 'chart_spec' configurado ou None.
    """
    query_result = state.get("query_result")
    if not query_result or not isinstance(query_result, list):
        return {"chart_spec": None}

    # Recupera última mensagem do usuário
    last_user_query = ""
    messages = state.get("messages", [])
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_query = str(msg.content)
            break

    explicit_intent = check_explicit_chart_intent(last_user_query) or bool(
        state.get("requires_chart")
    )

    configurable = (config or {}).get("configurable", {})
    try:
        llm = get_chat_model(
            provider=configurable.get("provider"),
            model=configurable.get("model"),
            api_key=configurable.get("api_key"),
            base_url=configurable.get("base_url"),
            timeout_seconds=configurable.get("timeout_seconds") or 30,
            temperature=0.0,
        )

        sample_data = query_result[:15]
        user_prompt = (
            f"Pergunta do usuário: {last_user_query}\n"
            f"Intenção explícita detectada: {'SIM' if explicit_intent else 'NÃO'}\n"
            f"Dados analíticos obtidos:\n{json.dumps(sample_data, ensure_ascii=False)}"
        )

        response = await llm.ainvoke([
            SystemMessage(content=CHART_DECISION_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ])

        raw_content = _clean_markdown_code_block(str(response.content))
        parsed = json.loads(raw_content)
        spec = _resolve_chart_spec(parsed, explicit_intent, last_user_query, query_result)
        return {"chart_spec": spec}

    except Exception as exc:
        logger.warning(
            "Falha ao avaliar gráfico via LLM (%s), verificando fallback: explicit=%s",
            exc,
            explicit_intent,
        )
        if explicit_intent:
            return {"chart_spec": _heuristic_chart_builder(last_user_query, query_result)}
        return {"chart_spec": None}
