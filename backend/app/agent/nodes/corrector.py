from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.nodes.sql_generator import CINEDATA_CATALOG_PROMPT, extract_thought_and_sql
from app.agent.state import AgentState, AgentStateUpdate
from app.core.llm_factory import get_chat_model

CORRECTOR_PROMPT = """A consulta SQL falhou na execução ou na validação do SQLite.
Seu objetivo é analisar a consulta com erro, a mensagem de falha e gerar uma NOVA
consulta corrigida que resolva o problema.

REGRAS:
1. Respeite estritamente o schema do cinerocket.db.
2. Certifique-se de que os nomes de colunas, tabelas e filtros atendam às regras de ouro.
3. Responda com <thought>explicando o ajuste</thought> seguido pelo bloco ```sql corrigido ```.
"""


async def sql_corrector_node(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
    """
    Nó de auto-recuperação (self-correction): analisa o erro anterior e gera nova tentativa de SQL.

    Args:
        state: Estado contendo 'generated_sql', 'last_error' e 'error_count'.
        config: Configuração do runner com provedor e credenciais.

    Returns:
        Atualização parcial do estado com thought e nova versão de generated_sql.
    """
    current_sql = state.get("generated_sql", "")
    error_msg = state.get("last_error", "Erro desconhecido")
    error_count = state.get("error_count", 0)

    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.0,
    )

    messages = [
        SystemMessage(content=f"{CINEDATA_CATALOG_PROMPT}\n\n{CORRECTOR_PROMPT}"),
        HumanMessage(
            content=(
                f"Consulta anterior com falha:\n```sql\n{current_sql}\n```\n\n"
                f"Mensagem de erro:\n{error_msg}\n\n"
                "Por favor, forneça a consulta SQL corrigida."
            )
        ),
    ]

    response = await llm.ainvoke(messages)
    raw_content = response.content if isinstance(response.content, str) else str(response.content)

    thought, sql = extract_thought_and_sql(raw_content)

    return {
        "thought": thought,
        "generated_sql": sql,
        "error_count": error_count,
    }
