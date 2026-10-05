import re

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.prompts import CINEDATA_CATALOG_PROMPT
from app.agent.state import AgentState, AgentStateUpdate
from app.core.constants import SqlErrorCategory
from app.core.llm_factory import get_chat_model


def extract_thought_and_sql(text: str) -> tuple[str | None, str | None]:
    """
    Extrai blocos <thought> e ```sql do output gerado pelo modelo.

    Args:
        text: Saída textual bruta emitida pelo LLM.

    Returns:
        Tupla (pensamento_extraido, codigo_sql_extraido).
    """
    thought_match = re.search(r"<thought>(.*?)</thought>", text, re.DOTALL | re.IGNORECASE)
    thought = getattr(thought_match, "group", lambda _: "")(1).strip() or None

    sql_match = re.search(r"```(?:sql)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if sql_match:
        return thought, sql_match.group(1).strip() or None

    clean_text = text.strip()
    if clean_text.upper().startswith(("SELECT", "WITH")):
        return thought, clean_text

    return thought, None


async def sql_generator_node(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
    """
    Nó gerador de SQL que injeta o catálogo semântico compacto e sintetiza a consulta analítica.

    Args:
        state: Estado do LangGraph contendo o histórico de mensagens.
        config: Configuração do runner com provedor e credenciais ativas.

    Returns:
        Atualização parcial do estado contendo thought, generated_sql e eventuais categorias de erro.
    """
    messages = state["messages"]
    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.0,
    )

    semantic_results = state.get("semantic_results")
    prompt_text = CINEDATA_CATALOG_PROMPT
    if semantic_results:
        candidates = [
            f"- ID: '{r['sk_movie_id']}', Título: '{r['titulo']}'" for r in semantic_results if r.get("sk_movie_id")
        ]
        if candidates:
            cand_str = "\n".join(candidates[:10])
            prompt_text += (
                f"\n\nCONTEXTO SEMÂNTICO ENCONTRADO (FLUXO HÍBRIDO RAG):\n"
                f"A busca semântica prévia em sinopses/resenhas identificou os seguintes filmes candidatos:\n"
                f"{cand_str}\n"
                f"IMPORTANTE: Restrinja sua consulta aos filmes identificados acima "
                f"(ex: WHERE m.sk_movie_id IN (...)) e combine com os filtros analíticos adicionais "
                f"solicitados pelo usuário (ex: bilheteria, faturamento, notas, ano)."
            )

    system_msg = SystemMessage(content=prompt_text)
    llm_input = [system_msg, *messages]

    response = await llm.ainvoke(llm_input)
    raw_content = response.content if isinstance(response.content, str) else str(response.content)

    thought, sql = extract_thought_and_sql(raw_content)

    last_error: str | None = None
    error_category: SqlErrorCategory | None = None

    if not sql:
        last_user_msg = ""
        for m in reversed(messages):
            if getattr(m, "type", "") == "human" or m.__class__.__name__ == "HumanMessage":
                last_user_msg = str(m.content).lower()
                break

        destructive_terms = (
            "limpar",
            "apagar",
            "deletar",
            "drop",
            "delete",
            "truncate",
            "remover tabelas",
            "excluir",
            "zerar",
            "destruir",
            "modificar",
        )
        if any(term in last_user_msg for term in destructive_terms):
            error_category = SqlErrorCategory.SECURITY_VIOLATION
            last_error = (
                "Operação não permitida por política de segurança: O banco CineData opera "
                "estritamente em modo de leitura (Read-Only). Consultas destrutivas, de exclusão "
                "ou de modificação (como DROP, DELETE, TRUNCATE) são bloqueadas."
            )
        else:
            error_category = SqlErrorCategory.UNSUPPORTED_REQUEST
            clean_raw = raw_content.strip()
            if thought and len(clean_raw) > len(thought):
                explanation = re.sub(r"<thought>.*?</thought>", "", clean_raw, flags=re.DOTALL | re.IGNORECASE).strip()
            else:
                explanation = clean_raw

            if explanation and len(explanation) > 10:
                last_error = f"Não foi possível gerar consulta SQL para este pedido: {explanation}"
            else:
                last_error = "Nenhum código SQL foi gerado para atender à solicitação."

    return {
        "thought": thought,
        "generated_sql": sql,
        "error_count": 0,
        "last_error": last_error,
        "error_category": error_category,
    }
