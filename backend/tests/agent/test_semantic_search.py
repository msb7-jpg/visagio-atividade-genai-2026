"""Testes unitários para o modelo de embeddings e o vector store."""

import numpy as np
import pytest

from app.agent.embeddings.embedding_model import get_embedding_model
from app.agent.embeddings.vector_store import get_vector_store
from app.agent.tools.semantic_search import search_movie_synopsis_and_reviews


def test_embedding_model_singleton_and_encoding():
    """Valida que o modelo de embeddings é carregado e gera vetores normalizados."""
    model_mgr = get_embedding_model()
    model_mgr.warmup()
    assert model_mgr.is_loaded is True

    texts = ["Filme de inteligência artificial futurista", "Comédia romântica em Paris"]
    vectors = model_mgr.encode(texts)
    assert vectors.shape[0] == 2
    assert vectors.shape[1] == 384

    # Norma L2 deve ser aproximadamente 1.0
    norm_0 = np.linalg.norm(vectors[0])
    assert pytest.approx(norm_0, 0.01) == 1.0


def test_vector_store_warmup_and_search():
    """Valida a busca vetorial semântica unificada no catálogo de filmes."""
    v_store = get_vector_store()
    v_store.warmup()

    assert v_store.is_initialized is True
    assert v_store.indexed_movies_count > 0

    results = v_store.search("viagem no tempo e buracos de minhoca", top_k=3)
    assert len(results) > 0
    assert "sk_movie_id" in results[0]
    assert "titulo" in results[0]
    assert "score_similaridade" in results[0]
    assert "trecho_relevante" in results[0]
    assert 0.0 <= results[0]["score_similaridade"] <= 1.0


def test_semantic_search_tool():
    """Valida a tool do LangChain search_movie_synopsis_and_reviews sem target."""
    res = search_movie_synopsis_and_reviews.invoke({
        "query": "robôs e inteligência artificial que se rebelam",
        "top_k": 3,
    })
    assert isinstance(res, list)
    assert len(res) > 0
    assert "sk_movie_id" in res[0]
    assert "titulo" in res[0]
    assert "trecho_relevante" in res[0]
