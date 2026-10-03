import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.schemas.chart_schema import ChartDataset, ChartJsConfigDTO
from app.agent.state import AgentState
from app.core.llm_factory import get_chat_model

logger = logging.getLogger(__name__)

CHART_DECISION_SYSTEM_PROMPT = """Você é o Especialista em Visualização de Dados do CineData Analytics.
Sua missão é avaliar a pergunta do usuário e os dados analíticos obtidos para decidir se a intenção do usuário pede ou se beneficia de uma representação visual (gráfico), e caso positivo, gerar a especificação Chart.js.

IMPORTANTE SOBRE INTENÇÃO DO USUÁRIO:
- Se o usuário fez uma pergunta que é puramente tabular ou objetiva (ex: "quais filmes", "liste os diretores", "me mostre a tabela", "tabela de lucro"), retorne "should_visualize": false. Nem toda tabela deve virar gráfico.
- Se o usuário pediu explicitamente um gráfico (ex: "faça um gráfico", "gere um gráfico", "mostre visualmente", "/chart", "pizza", "barras", "evolução visual", "gráfico de linhas"), ou se expressou desejo explícito de comparar visualmente dados agregados, retorne "should_visualize": true.
- Caso o usuário não tenha expressado intenção visual, retorne "should_visualize": false.

REGRAS DE RESPOSTA:
1. Responda ESTRITAMENTE em formato JSON com a seguinte estrutura:
   {
     "should_visualize": true ou false,
     "chart": {
       "type": "bar", "line", "pie" ou "doughnut",
       "title": "título descritivo e claro para o gráfico",
       "labels": ["label1", "label2", ...],
       "datasets": [
         {
           "label": "Nome da Métrica",
           "data": [10.5, 20.0, ...]
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


def _heuristic_chart_builder(
    user_query: str, query_result: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """
    Constrói a especificação do gráfico de forma determinística caso os dados sejam adequados.
    Usado como fallback caso a chamada ao LLM falhe.
    """
    if not query_result or not isinstance(query_result, list):
        return None

    first_row = query_result[0]
    keys = list(first_row.keys())
    if len(keys) < 2:
        return None

    label_col = None
    metric_col = None

    for k in keys:
        sample_val = first_row[k]
        if isinstance(sample_val, str) and label_col is None:
            label_col = k
        elif isinstance(sample_val, (int, float)) and metric_col is None:
            metric_col = k

    if not label_col:
        label_col = keys[0]
    if not metric_col:
        for k in keys:
            if k != label_col and isinstance(first_row[k], (int, float)):
                metric_col = k
                break

    if not metric_col:
        return None

    labels = [str(row.get(label_col, "")) for row in query_result[:15]]
    data = [float(row.get(metric_col, 0) or 0) for row in query_result[:15]]

    query_lower = user_query.lower()
    chart_type = "bar"
    if "linha" in query_lower or "temporal" in query_lower or "evolução" in query_lower:
        chart_type = "line"
    elif "pizza" in query_lower or "distribuição" in query_lower or "rosca" in query_lower:
        chart_type = "doughnut" if "rosca" in query_lower else "pie"

    metric_name = metric_col.replace("_", " ").title()
    title = f"{metric_name} por {label_col.replace('_', ' ').title()}"

    dto = ChartJsConfigDTO(
        type=chart_type,
        title=title,
        labels=labels,
        datasets=[ChartDataset(label=metric_name, data=data)],
    )
    return dto.model_dump()


def check_explicit_chart_intent(query: str) -> bool:
    """Verifica se há intenção explícita no texto ou comando /chart."""
    q = query.lower()
    if "/chart" in q:
        return True
    keywords = [
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
    ]
    return any(k in q for k in keywords)


async def chart_generator_node(
    state: AgentState, config: RunnableConfig | None = None
) -> dict[str, Any]:
    """
    Nó do LangGraph responsável por avaliar se há intenção e valor em gerar gráfico
    e estruturar o ChartJsConfigDTO correspondente.
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

    # Se houver comando explícito /chart ou intenção expressa no state
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

        raw_content = str(response.content).strip()
        if raw_content.startswith("```"):
            lines = raw_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_content = "\n".join(lines).strip()

        parsed = json.loads(raw_content)

        # Se o modelo avaliar que não deve gerar gráfico
        if not parsed.get("should_visualize", False) and not explicit_intent:
            return {"chart_spec": None}

        chart_data = parsed.get("chart")
        if not chart_data:
            if explicit_intent:
                # Se era explícito mas o modelo omitiu o objeto chart, aciona o fallback heurístico
                return {"chart_spec": _heuristic_chart_builder(last_user_query, query_result)}
            return {"chart_spec": None}

        dto = ChartJsConfigDTO(**chart_data)
        return {"chart_spec": dto.model_dump()}

    except Exception as exc:
        logger.warning(
            "Falha ao avaliar gráfico via LLM (%s), verificando fallback: explicit=%s",
            exc,
            explicit_intent,
        )
        # Fallback inteligente: se o usuário tinha intenção de gráfico, aplica a heurística
        if explicit_intent:
            fallback = _heuristic_chart_builder(last_user_query, query_result)
            return {"chart_spec": fallback}
        return {"chart_spec": None}
