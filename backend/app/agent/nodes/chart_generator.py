import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.prompts import CHART_DECISION_SYSTEM_PROMPT
from app.agent.schemas.chart_schema import ChartDataset, ChartJsConfigDTO
from app.agent.state import AgentState, AgentStateUpdate
from app.core.constants import ChartType, QueryResultRow
from app.core.llm_factory import get_chat_model

logger = logging.getLogger(__name__)

# Colunas preferenciais para rótulos em gráficos (eixo X / categorias)
PREFERRED_LABEL_COLUMNS = (
    "titulo",
    "title",
    "nome_filme",
    "nome_pessoa",
    "nome_genero",
    "nome_produtora",
    "ano_lancamento",
    "ano",
)

# Colunas técnicas de identificadores que NUNCA devem ser usadas como rótulos
TECHNICAL_ID_COLUMNS = {
    "sk_movie_id",
    "id_filme",
    "sk_person_id",
    "sk_genre_id",
    "sk_company_id",
}


def _detect_chart_type(query_lower: str, forced_type: str | None = None) -> ChartType:
    """Determina o tipo de gráfico baseado em argumento forçado ou palavras-chave."""
    if forced_type:
        ft = forced_type.lower().strip()
        if ft in ("line", "linha", "temporal"):
            return ChartType.LINE
        if ft in ("pie", "pizza"):
            return ChartType.PIE
        if ft in ("doughnut", "rosca"):
            return ChartType.DOUGHNUT
        if ft in ("bar", "barra", "barras"):
            return ChartType.BAR

    if "linha" in query_lower or "temporal" in query_lower or "evolução" in query_lower:
        return ChartType.LINE
    if "rosca" in query_lower:
        return ChartType.DOUGHNUT
    if "pizza" in query_lower or "distribuição" in query_lower:
        return ChartType.PIE
    return ChartType.BAR


def _is_technical_id(col_name: str) -> bool:
    """Verifica se a coluna é um ID técnico/hash que não deve ser exibido ao usuário."""
    col_lower = col_name.lower()
    return (
        col_lower in TECHNICAL_ID_COLUMNS
        or col_lower.startswith("sk_")
        or col_lower.endswith("_id")
    )


def _find_label_column(first_row: QueryResultRow, keys: list[str]) -> str | None:
    """Busca coluna de rótulo para gráfico priorizando entidades semânticas e rejeitando IDs."""
    for preferred in PREFERRED_LABEL_COLUMNS:
        for k in keys:
            if k.lower() == preferred and first_row[k] is not None:
                return k

    for k in keys:
        if not _is_technical_id(k) and isinstance(first_row[k], str):
            return k

    return None


def _find_metric_column(first_row: QueryResultRow, keys: list[str], label_col: str | None) -> str | None:
    """Busca coluna numérica para gráfico priorizando métricas e evitando anos se houver valores."""
    metric_candidate = None
    for k in keys:
        if k == label_col or _is_technical_id(k):
            continue
        sample_val = first_row[k]
        if isinstance(sample_val, (int, float)):
            if "ano" not in k.lower():
                return k
            if metric_candidate is None:
                metric_candidate = k
    return metric_candidate


def _extract_columns(first_row: QueryResultRow, keys: list[str]) -> tuple[str | None, str | None]:
    """
    Identifica de forma inteligente colunas de rótulo e de métrica numérica,
    priorizando nomes de entidades reais e descartando hashes/IDs técnicos.
    """
    label_col = _find_label_column(first_row, keys)
    metric_col = _find_metric_column(first_row, keys, label_col)
    return label_col, metric_col


def _heuristic_chart_builder(
    user_query: str,
    query_result: list[QueryResultRow],
    forced_type: str | None = None,
) -> dict[str, Any] | None:
    """
    Constrói a especificação do gráfico de forma determinística caso os dados sejam adequados.

    Args:
        user_query: Consulta original do usuário.
        query_result: Linhas retornadas pela execução da consulta SQL.
        forced_type: Tipo de gráfico opcionalmente forçado (ex: via /chart bar).

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

    chart_type = _detect_chart_type(user_query.lower(), forced_type=forced_type)
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
    forced_type: str | None = None,
) -> dict[str, Any] | None:
    """Valida o payload parseado do LLM e aplica fallback heurístico se necessário."""
    if not parsed.get("should_visualize") and not explicit_intent:
        return None

    chart_data = parsed.get("chart")
    if not chart_data:
        if explicit_intent:
            return _heuristic_chart_builder(last_user_query, query_result, forced_type=forced_type)
        return None

    if forced_type:
        chart_data["type"] = _detect_chart_type("", forced_type=forced_type).value

    dto = ChartJsConfigDTO(**chart_data)
    return dto.model_dump()


async def chart_generator_node(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
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

    command = state.get("command")
    forced_type: str | None = None
    if command and command.get("name") == "chart":
        forced_type = command.get("args")

    explicit_intent = check_explicit_chart_intent(last_user_query) or bool(state.get("requires_chart"))

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
            f"Tipo preferencial forçado: {forced_type or 'Nenhum'}\n"
            f"Dados analíticos obtidos:\n{json.dumps(sample_data, ensure_ascii=False)}"
        )

        response = await llm.ainvoke([
            SystemMessage(content=CHART_DECISION_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ])

        raw_content = _clean_markdown_code_block(str(response.content))
        parsed = json.loads(raw_content)
        spec = _resolve_chart_spec(
            parsed,
            explicit_intent,
            last_user_query,
            query_result,
            forced_type=forced_type,
        )
        if spec:
            logger.info(
                "Gráfico gerado: tipo='%s', título='%s', labels=%d",
                spec.get("type"),
                spec.get("title"),
                len(spec.get("labels", [])),
            )
        else:
            logger.info("Nenhum gráfico gerado para a resposta analítica (should_visualize=False).")
        return {"chart_spec": spec}

    except Exception as exc:
        logger.warning(
            "Falha ao avaliar gráfico via LLM (%s), verificando fallback: explicit=%s",
            exc,
            explicit_intent,
        )
        if explicit_intent:
            spec = _heuristic_chart_builder(
                last_user_query,
                query_result,
                forced_type=forced_type,
            )
            logger.info("Gráfico gerado via fallback heurístico: %s", bool(spec))
            return {"chart_spec": spec}
        return {"chart_spec": None}
