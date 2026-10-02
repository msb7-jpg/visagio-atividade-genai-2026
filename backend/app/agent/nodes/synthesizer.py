import json
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.state import AgentState
from app.core.llm_factory import get_chat_model

SYNTHESIZER_PROMPT = """Você é o Assistente Executivo Sênior da CineData Analytics.
Sua função é apresentar ao usuário a resposta analítica clara, fundamentada e em Markdown executivo de alto padrão.

DIRETRIZES:
1. Responda em Português do Brasil com tom profissional, analítico e objetivo.
2. Formatação e Hierarquia Markdown:
   - Use títulos com `#` e `##` para temas principais e `###` para tópicos secundários.
   - SEMPRE deixe uma linha em branco antes e depois de qualquer título ou tabela.
   - Ao apresentar dados tabulares, use OBRIGATORIAMENTE a sintaxe padrão de tabelas Markdown (GFM) com pipes (`|`) e linha separadora de traços (`|:---|:---|`), por exemplo:
     | Rank | Título | Ano | Receita (USD) | Receita (BRL) |
     | :--- | :----- | :-- | :------------ | :------------ |
     | 1    | Filme  | ... | ...           | ...           |
   - NUNCA cole o título ou emoji na mesma linha da tabela; o título da tabela deve vir antes, como um subtítulo (`### Nome da Tabela`), seguido de uma linha em branco.
3. Formate valores monetários adequadamente (ex: R$ 1.250.000,00 ou US$ 50.000.000,00).
4. Se o resultado estiver vazio, explique gentilmente que nenhum registro atendeu aos critérios.
5. Se tiver ocorrido erro irrecuperável, informe o usuário de maneira compreensível.
6. Não invente números fora dos dados fornecidos.
"""


async def synthesizer_node(
    state: AgentState, config: RunnableConfig | None = None
) -> dict[str, Any]:
    """
    Sintetiza a resposta executiva final em Markdown para o usuário.
    """
    messages = state["messages"]
    query_result = state.get("query_result")
    generated_sql = state.get("generated_sql")
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


    context_info = f"Rota: {route}\n"
    if generated_sql:
        context_info += f"SQL Executado:\n```sql\n{generated_sql}\n```\n"

    if query_result is not None:
        sample_results = query_result[:30]
        dumped_sample = json.dumps(sample_results, ensure_ascii=False, indent=2)
        context_info += f"Dados Retornados ({len(query_result)} linhas):\n{dumped_sample}\n"
    elif last_error:
        context_info += f"Houve um erro na execução: {last_error}\n"

    full_prompt = f"{SYNTHESIZER_PROMPT}\n\n[CONTEXTO DOS DADOS]\n{context_info}"
    system_msg = SystemMessage(content=full_prompt)
    llm_input = [system_msg, *messages]

    response = await llm.ainvoke(llm_input)
    ai_content = response.content if isinstance(response.content, str) else str(response.content)

    return {
        "messages": [AIMessage(content=ai_content)],
    }
