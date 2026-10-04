import json
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.prompts.synthesizer_prompt import (
    CHART_PRESENT_PROMPT,
    SYNTHESIZER_PROMPT,
    TABLE_PRESENT_PROMPT,
)
from app.agent.state import AgentState, AgentStateUpdate
from app.core.llm_factory import get_chat_model


def _extract_movie_mappings(rows: list[Any]) -> str:
    """Extrai tabela auxiliar de mapeamento de IDs de filmes para o contexto."""
    mappings: list[str] = []
    for row in rows:
        if isinstance(row, dict):
            title = row.get("titulo") or row.get("title") or row.get("nome_filme")
            sk_id = row.get("sk_movie_id") or row.get("id_filme")
            if title and sk_id:
                mappings.append(f"- '{title}': '{sk_id}'")
    if not mappings:
        return ""
    return (
        "\nTABELA DE SK_MOVIE_ID IDENTIFICADOS NOS DADOS (USE PARA ANOTAR [Título](movie:sk_movie_id)):\n"
        + "\n".join(mappings)
        + "\n"
    )


def _build_context_info(state: AgentState) -> str:
    """Monta a string descritiva de contexto para injeção no prompt do sintetizador."""
    route = state.get("route", "sql")
    generated_sql = state.get("generated_sql")
    query_result = state.get("query_result")
    semantic_results = state.get("semantic_results")
    data_analysis_result = state.get("data_analysis_result")
    last_error = state.get("last_error")
    error_category = state.get("error_category")

    context_info = f"Rota: {route}\n"
    if semantic_results:
        dumped_semantic = json.dumps(semantic_results, ensure_ascii=False, indent=2)
        context_info += f"Evidências Semânticas Encontradas (RAG):\n{dumped_semantic}\n"

    if generated_sql:
        context_info += f"SQL Executado:\n```sql\n{generated_sql}\n```\n"

    if query_result is not None:
        sample_results = query_result[:30]
        dumped_sample = json.dumps(sample_results, ensure_ascii=False, indent=2)
        context_info += f"Dados Retornados ({len(query_result)} linhas):\n{dumped_sample}\n"
        context_info += _extract_movie_mappings(sample_results)

    if data_analysis_result:
        context_info += f"Resultado do Cálculo Estatístico/Matemático (Sandbox):\n{data_analysis_result}\n"

    if last_error:
        context_info += f"Houve um erro na execução: {last_error}\n"
        if error_category:
            context_info += f"Categoria do Erro: {error_category}\n"

    return context_info


def _build_visualization_guideline(chart_spec: dict[str, Any] | None) -> str:
    """Retorna as diretrizes de visualização gráfica ou tabular conforme chart_spec."""
    if not chart_spec:
        return TABLE_PRESENT_PROMPT

    chart_title = chart_spec.get("title", "Gráfico")
    chart_type = chart_spec.get("type", "bar")
    return CHART_PRESENT_PROMPT.format(
        chart_title=chart_title,
        chart_type=chart_type,
    )


def _build_additional_kwargs(state: AgentState, configurable: dict[str, Any]) -> dict[str, Any]:
    """Constrói o dicionário additional_kwargs para persistência na AIMessage."""
    additional_kwargs: dict[str, Any] = {}
    for key in ("provider", "model"):
        val = configurable.get(key)
        if val:
            additional_kwargs[key] = val

    for key in ("thought", "generated_sql", "chart_spec", "steps", "semantic_results", "data_analysis_result"):
        val = state.get(key)
        if val:
            additional_kwargs[key] = val

    return additional_kwargs


async def synthesizer_node(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
    """
    Sintetiza a resposta executiva final em Markdown para o usuário.

    Args:
        state: Estado consolidado contendo histórico, query_result, chart_spec e last_error.
        config: Configuração do runner com provedor e credenciais.

    Returns:
        Atualização parcial do estado contendo a mensagem AIMessage sintetizada.
    """
    messages = state["messages"]
    chart_spec = state.get("chart_spec")

    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.3,
    )

    context_info = _build_context_info(state)
    visualization_guideline = _build_visualization_guideline(chart_spec)

    full_prompt = f"{SYNTHESIZER_PROMPT}\n\n{visualization_guideline}\n\n[CONTEXTO DOS DADOS]\n{context_info}"
    system_msg = SystemMessage(content=full_prompt)
    llm_input = [system_msg, *messages]

    response = await llm.ainvoke(llm_input)
    ai_content = response.content if isinstance(response.content, str) else str(response.content)

    additional_kwargs = _build_additional_kwargs(state, configurable)

    return {"messages": [AIMessage(content=ai_content, additional_kwargs=additional_kwargs)]}
