import logging
import re
from collections.abc import Mapping, Sequence
from typing import Any

from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.prompts import CINEDATA_CATALOG_PROMPT
from app.agent.state import AgentState, AgentStateUpdate
from app.core.constants import SqlErrorCategory
from app.core.llm_factory import get_chat_model

logger = logging.getLogger(__name__)


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


def _is_destructive_request(messages: list[Any]) -> bool:
    """Verifica se a última mensagem do usuário contém termos destrutivos ou de mutação."""
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
    return any(term in last_user_msg for term in destructive_terms)


def _resolve_sql_error_payload(
    messages: list[Any],
    raw_content: str,
    thought: str | None,
) -> tuple[str, SqlErrorCategory]:
    """Determina a categoria e a mensagem de erro quando nenhum SQL foi sintetizado."""
    if _is_destructive_request(messages):
        return (
            (
                "Operação não permitida por política de segurança: O banco CineData opera "
                "estritamente em modo de leitura (Read-Only). Consultas destrutivas, de exclusão "
                "ou de modificação (como DROP, DELETE, TRUNCATE) são bloqueadas."
            ),
            SqlErrorCategory.SECURITY_VIOLATION,
        )

    clean_raw = raw_content.strip()
    explanation = clean_raw
    if thought and len(clean_raw) > len(thought):
        explanation = re.sub(r"<thought>.*?</thought>", "", clean_raw, flags=re.DOTALL | re.IGNORECASE).strip()

    if explanation and len(explanation) > 10:
        return (
            f"Não foi possível gerar consulta SQL para este pedido: {explanation}",
            SqlErrorCategory.UNSUPPORTED_REQUEST,
        )

    return (
        "Nenhum código SQL foi gerado para atender à solicitação.",
        SqlErrorCategory.UNSUPPORTED_REQUEST,
    )


def _log_generation_status(
    sql: str | None,
    error_category: SqlErrorCategory | None,
    last_error: str | None,
) -> None:
    """Registra em log estruturado o desfecho da sintetização SQL."""
    if sql:
        logger.info("Consulta SQL gerada com sucesso: %s", sql.replace("\n", " ")[:120])
        return

    if error_category == SqlErrorCategory.SECURITY_VIOLATION:
        logger.warning("Bloqueio de segurança no gerador de SQL: %s", last_error)
        return

    logger.info("Nenhum SQL gerado para a solicitação (não suportada ou fora de escopo): %s", last_error)


def _build_catalog_prompt_with_candidates(
    base_prompt: str,
    semantic_results: Sequence[Mapping[str, Any]] | None,
) -> str:
    """Combina o catálogo semântico básico com os candidatos obtidos no fluxo híbrido RAG."""
    if not semantic_results:
        return base_prompt

    candidates = [
        f"- ID: '{record['sk_movie_id']}', Título: '{record['titulo']}'"
        for record in semantic_results
        if record.get("sk_movie_id")
    ]
    if not candidates:
        return base_prompt

    candidate_block = "\n".join(candidates[:10])
    return (
        f"{base_prompt}\n\nCONTEXTO SEMÂNTICO ENCONTRADO (FLUXO HÍBRIDO RAG):\n"
        f"A busca semântica prévia em sinopses/resenhas identificou os seguintes filmes candidatos:\n"
        f"{candidate_block}\n"
        f"IMPORTANTE: Restrinja sua consulta aos filmes identificados acima "
        f"(ex: WHERE m.sk_movie_id IN (...)) e combine com os filtros analíticos adicionais "
        f"solicitados pelo usuário (ex: bilheteria, faturamento, notas, ano)."
    )


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

    prompt_text = _build_catalog_prompt_with_candidates(
        CINEDATA_CATALOG_PROMPT,
        state.get("semantic_results"),
    )

    system_msg = SystemMessage(content=prompt_text)
    llm_input = [system_msg, *messages]

    response = await llm.ainvoke(llm_input)
    raw_content = response.content if isinstance(response.content, str) else str(response.content)

    thought, sql = extract_thought_and_sql(raw_content)

    last_error: str | None = None
    error_category: SqlErrorCategory | None = None

    if not sql:
        last_error, error_category = _resolve_sql_error_payload(messages, raw_content, thought)

    _log_generation_status(sql, error_category, last_error)

    return {
        "thought": thought,
        "generated_sql": sql,
        "error_count": 0,
        "last_error": last_error,
        "error_category": error_category,
    }
