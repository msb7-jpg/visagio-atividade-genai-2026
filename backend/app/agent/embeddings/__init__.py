"""Módulo de embeddings e gerenciamento de vetores semânticos."""

from app.agent.embeddings.embedding_model import EmbeddingModelManager, get_embedding_model
from app.agent.embeddings.vector_store import VectorStore, get_vector_store

__all__ = ["EmbeddingModelManager", "VectorStore", "get_embedding_model", "get_vector_store"]
