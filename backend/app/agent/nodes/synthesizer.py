import json
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.prompts.synthesizer_prompt import (
    CHART_PRESENT_PROMPT,
    SYNTHESIZER_PROMPT,
    TABLE_PRESENT_PROMPT,
)
from app.agent.state import AgentState
from app.core.llm_factory import get_chat_model


async def synthesizer_node(
    state: AgentState, config: RunnableConfig | None = None
) -> dict[str, Any]:
    """
    Sintetiza a resposta executiva final em Markdown para o usuário.
    """
    messages = state["messages"]
    query_result = state.get("query_result")
    generated_sql = state.get("generated_sql")
    chart_spec = state.get("chart_spec")
    last_error = state.get("last_error")
    route = state.get("route", "sql")

    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.3,
    )

    error_category = state.get("error_category")

    context_info = f"Rota: {route}\n"
    if generated_sql:
        context_info += f"SQL Executado:\n```sql\n{generated_sql}\n```\n"

    # Diretrizes específicas de visualização gráfica vs. tabular injetadas dinamicamente
    if chart_spec:
        chart_title = chart_spec.get("title", "Gráfico")
        chart_type = chart_spec.get("type", "bar")
        visualization_guideline = CHART_PRESENT_PROMPT.format(
            chart_title=chart_title, 
            chart_type=chart_type
        )

    else:
        visualization_guideline = TABLE_PRESENT_PROMPT

    if query_result is not None:
        sample_results = query_result[:30]
        dumped_sample = json.dumps(sample_results, ensure_ascii=False, indent=2)
        context_info += f"Dados Retornados ({len(query_result)} linhas):\n{dumped_sample}\n"
    elif last_error:
        context_info += f"Houve um erro na execução: {last_error}\n"
        if error_category:
            context_info += f"Categoria do Erro: {error_category}\n"

    full_prompt = (
        f"{SYNTHESIZER_PROMPT}\n\n"
        f"{visualization_guideline}\n\n"
        f"[CONTEXTO DOS DADOS]\n"
        f"{context_info}"
    )
    system_msg = SystemMessage(content=full_prompt)
    llm_input = [system_msg, *messages]

    response = await llm.ainvoke(llm_input)
    ai_content = response.content if isinstance(response.content, str) else str(response.content)

    thought = state.get("thought")
    steps = state.get("steps") or []

    additional_kwargs: dict[str, Any] = {}
    if thought:
        additional_kwargs["thought"] = thought
    if generated_sql:
        additional_kwargs["generated_sql"] = generated_sql
    if chart_spec:
        additional_kwargs["chart_spec"] = chart_spec
    if steps:
        additional_kwargs["steps"] = steps

    return {
        "messages": [AIMessage(content=ai_content, additional_kwargs=additional_kwargs)],
    }
