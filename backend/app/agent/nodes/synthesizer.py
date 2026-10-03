import json
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.state import AgentState
from app.core.llm_factory import get_chat_model

SYNTHESIZER_PROMPT = """Você é o Assistente Executivo Sênior da CineData Analytics.
Sua função é apresentar ao usuário a resposta analítica clara, fundamentada e em Markdown executivo de alto padrão.

DIRETRIZES GERAIS:
1. Responda em Português do Brasil com tom profissional, analítico e objetivo.
2. Formatação e Hierarquia Markdown:
   - Use títulos com `#` e `##` para temas principais e `###` para tópicos secundários.
   - SEMPRE deixe uma linha em branco antes e depois de qualquer título ou tabela.
   - NUNCA cole o título ou emoji na mesma linha da tabela; o título da tabela deve vir antes, como um subtítulo (`### Nome da Tabela`), seguido de uma linha em branco.
3. Formate valores monetários adequadamente (ex: R$ 1.250.000,00 ou US$ 50.000.000,00).
4. Se o resultado estiver vazio, explique gentilmente que nenhum registro atendeu aos critérios.
5. Contexto Temporal do Catálogo:
   - O dataset do CineData cobre historicamente produções lançadas entre 2016 e 2024 (dados consolidados até 2024).
   - O catálogo não possui lançamentos contemporâneos de 2025/2026 em diante (apenas pouquíssimos registros futuros/em produção cadastrados previamente).
   - Se o usuário perguntar sobre lançamentos recentes, filmes "deste ano" ou questionar ausência de títulos de 2025/2026, contextualize educadamente que a base histórica de dados abrange prioritariamente o período de 2016 até 2024.
6. Se tiver ocorrido erro de validação, comando proibido ou política de segurança (ex: tentativas de exclusão, DROP, DELETE, TRUNCATE, UPDATE ou manipulação de dados):
   - Explique com clareza e cortesia profissional que o CineData Analytics opera exclusivamente em modo de consulta (Read-Only).
   - Destaque que operações de alteração, limpeza ou remoção de tabelas são bloqueadas por diretrizes de governança e segurança.
   - Sugira consultas analíticas alternativas que o usuário possa realizar no catálogo.
7. Se tiver ocorrido outro tipo de erro técnico, informe o usuário de maneira compreensível.
8. Não invente números fora dos dados fornecidos.
"""

CHART_PRESENT_PROMPT = (
"""[DIRETRIZ DE VISUALIZAÇÃO GRÁFICA]:
Um Gráfico Interativo ('{chart_title}', Tipo: {chart_type}) FOI GERADO com sucesso para esta análise.
- Você DEVE posicioná-lo no ponto ideal da sua análise inserindo o marcador exato:
```chart
```
- NÃO duplique os dados gerando uma tabela com as mesmas métricas se o gráfico já as ilustra, a não ser que o usuário tenha pedido EXPLICITAMENTE tanto tabela quanto gráfico (ex: 'mostre a tabela e o gráfico').
- PROIBIÇÃO ABSOLUTA: NUNCA tente desenhar gráficos em ASCII, caracteres simulando barras (ex: █, ▓, ▒, -, #) ou tabelas manuais de barras. Toda a visualização gráfica é tratada nativamente pelo componente via marcador ```chart```.
- Use o texto para contextualizar insights, números de destaque e a interpretação analítica dos dados.
"""
)

TABLE_PRESENT_PROMPT = (
    """[DIRETRIZ DE DADOS TABULARES]:
    Nenhum gráfico interativo foi gerado para esta resposta.
    - Apresente os dados tabulares usando a sintaxe padrão de tabelas Markdown (GFM) com pipes (`|`) e linha separadora de traços (`|:---|:---|`).
    - PROIBIÇÃO ABSOLUTA: NUNCA tente desenhar gráficos em ASCII, caracteres simulando barras (ex: █, ▓, ▒, -, #) ou colunas como 'Barra (≈ 50 caracteres)'.
    """
)

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

    return {
        "messages": [AIMessage(content=ai_content)],
    }
