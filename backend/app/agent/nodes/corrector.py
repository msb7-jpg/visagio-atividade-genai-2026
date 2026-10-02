from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.nodes.sql_generator import CINEDATA_CATALOG_PROMPT, extract_thought_and_sql
from app.agent.state import AgentState
from app.core.llm_factory import get_chat_model

CORRECTOR_PROMPT = """A consulta SQL falhou na execução ou na validação do SQLite.
Seu objetivo é analisar a consulta com erro, a mensagem de falha e gerar uma NOVA
consulta corrigida que resolva o problema.

REGRAS:
1. Respeite estritamente o schema do cinerocket.db.
2. Certifique-se de que os nomes de colunas, tabelas e filtros atendam às regras de ouro.
3. Responda com <thought>explicando o ajuste</thought> seguido pelo bloco ```sql corrigido ```.
"""


async def sql_corrector_node(state: AgentState) -> dict[str, Any]:
    """
    Nó de auto-recuperação (self-correction): analisa o erro e gera nova tentativa de SQL.
    """
    current_sql = state.get("generated_sql", "")
    error_msg = state.get("last_error", "Erro desconhecido")
    error_count = state.get("error_count", 0)

    llm = get_chat_model(temperature=0.0)

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
