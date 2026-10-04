"""Ferramenta LangChain para busca semântica no catálogo de filmes com embeddings."""

from langchain_core.tools import tool

from app.agent.embeddings.vector_store import MovieSearchResult, get_vector_store


@tool
def search_movie_synopsis_and_reviews(
    query: str,
    top_k: int = 5,
) -> list[MovieSearchResult]:
    """
    Realiza busca vetorial semântica unificada no catálogo de filmes usando sqlite-vec.

    Ideal para encontrar filmes por temas subjetivos, conceitos em linguagem natural,
    tramas ou descrições (ex: 'filmes de inteligência artificial futurista',
    'viagem no tempo', 'superação de perdas familiares').

    Args:
        query: Conceito temático ou descrição em linguagem natural.
        top_k: Quantidade máxima de filmes relevantes a retornar (padrão: 5).

    Returns:
        Lista estritamente tipada de MovieSearchResult com título, ano, métricas e trecho relevante.
    """
    vector_store = get_vector_store()
    return vector_store.search(query=query, top_k=top_k)
