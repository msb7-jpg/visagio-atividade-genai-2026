from collections.abc import Mapping, Sequence
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.prompts import (
    CHART_PRESENT_PROMPT,
    SYNTHESIZER_PROMPT,
    TABLE_PRESENT_PROMPT,
    serialize_to_toon_tabular,
)
from app.agent.state import AgentState, AgentStateUpdate
from app.core.llm_factory import get_chat_model


def _check_movie_ids_integrity(sample_results: Sequence[Mapping[str, object]]) -> str:
    """Retorna aviso de integridade caso os dados tenham IDs mas não tenham títulos de filmes."""
    has_sk_id = False
    has_title = False

    for row_record in sample_results:
        if row_record.get("sk_movie_id") or row_record.get("id_filme"):
            has_sk_id = True
        if row_record.get("titulo") or row_record.get("title") or row_record.get("nome_filme"):
            has_title = True

    if has_sk_id and not has_title:
        return (
            "\nAVISO DE INTEGRIDADE: Os dados retornados contêm IDs mas não contêm a coluna de títulos (titulo). "
            "NUNCA invente títulos fictícios para os registros. Apresente os dados com os campos existentes.\n"
        )

    return ""


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
        toon_semantic = serialize_to_toon_tabular("evidencias_semanticas", semantic_results)
        context_info += f"Evidências Semânticas Encontradas (RAG):\n{toon_semantic}\n"

    if generated_sql:
        context_info += f"SQL Executado:\n```sql\n{generated_sql}\n```\n"

    if query_result is not None:
        sample_results = query_result[:30]
        toon_data = serialize_to_toon_tabular("dados_analiticos", sample_results)
        context_info += f"Dados Retornados ({len(query_result)} linhas):\n{toon_data}\n"
        context_info += _check_movie_ids_integrity(sample_results)

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
