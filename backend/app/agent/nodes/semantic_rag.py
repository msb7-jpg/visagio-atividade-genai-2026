"""Nó do LangGraph para busca vetorial semântica unificada no catálogo de filmes."""

import asyncio
import logging

from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig

from app.agent.embeddings.vector_store import get_vector_store
from app.agent.state import AgentState, AgentStateUpdate

logger = logging.getLogger(__name__)


async def semantic_search_node(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
    """
    Executa a busca por similaridade de cosseno no contexto de filmes usando embeddings locais e sqlite-vec.

    Args:
        state: Estado atual contendo o histórico de mensagens.
        config: Configurações de execução.

    Returns:
        Atualização de estado com semantic_results preenchido e thought de diagnóstico.
    """
    messages = state.get("messages", [])
    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = str(msg.content)
            break

    if not last_user_message:
        return {"semantic_results": []}

    vector_store = get_vector_store()
    top_k = 5 if state.get("route") == "rag" else 8
    logger.info("Executando busca semântica vetorial unificada (top_k: %d)...", top_k)
    results = await asyncio.to_thread(vector_store.search, query=last_user_message, top_k=top_k)

    found_titles = [f"'{r['titulo']}' (score: {r['score_similaridade']})" for r in results[:3]]
    titles_summary = ", ".join(found_titles) if found_titles else "nenhum resultado relevante"

    thought_msg = (
        f"Busca semântica vetorial concluiu com {len(results)} correspondências. Top candidatos: {titles_summary}."
    )

    return {
        "semantic_results": results,
        "thought": thought_msg,
    }
