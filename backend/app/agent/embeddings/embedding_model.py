"""Gerenciador singleton de modelo de embeddings locais com SentenceTransformer."""

import logging
from threading import Lock

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingModelManager:
    """Gerencia o ciclo de vida do modelo local de embeddings (Hugging Face / SentenceTransformer)."""

    _instance: "EmbeddingModelManager | None" = None
    _lock: Lock = Lock()

    def __init__(self) -> None:
        """Inicializa o gerenciador com estado desacoplado."""
        self._model: SentenceTransformer | None = None
        self._load_lock = Lock()

    @classmethod
    def get_instance(cls) -> "EmbeddingModelManager":
        """Retorna a instância singleton do gerenciador."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @property
    def is_loaded(self) -> bool:
        """Indica se os pesos do modelo já estão carregados na memória."""
        return self._model is not None

    @property
    def raw_model(self) -> SentenceTransformer | None:
        """Retorna a instância interna do SentenceTransformer para operações de baixo nível."""
        return self._model

    def warmup(self) -> None:
        """
        Carrega antecipadamente os pesos do modelo de embeddings na inicialização do servidor.

        Garante que nenhuma requisição de usuário sofra com latência de inicialização fria.
        """
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return

            settings = get_settings()
            model_name = settings.embedding_model_name
            logger.info("Carregando modelo de embeddings local: %s...", model_name)
            try:
                self._model = SentenceTransformer(model_name)
                # Dry-run rápido para aquecer grafos de execução
                self._model.encode(["CineData Analytics Warmup"], normalize_embeddings=True)
            except Exception as load_error:
                logger.warning(
                    "Não foi possível alocar embeddings na GPU (%s). Ativando fallback resiliente em CPU...",
                    load_error,
                )
                self._model = SentenceTransformer(model_name, device="cpu")
                self._model.encode(["CineData Analytics Warmup"], normalize_embeddings=True)

            logger.info("Modelo de embeddings carregado e aquecido com sucesso.")

    def encode(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        """
        Gera matriz de embeddings normalizados L2 para uma lista de textos.

        Args:
            texts: Textos a serem vetorizados.
            batch_size: Tamanho do lote para inferência.

        Returns:
            Matriz numpy de formato (len(texts), embedding_dim) com vetores normalizados.
        """
        if not texts:
            return np.empty((0, 384), dtype=np.float32)

        if self._model is None:
            self.warmup()

        assert self._model is not None
        embeddings = self._model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return np.asarray(embeddings, dtype=np.float32)

    def encode_query(self, query: str) -> np.ndarray:
        """
        Gera o vetor normalizado L2 para uma consulta de busca semântica.

        Args:
            query: Termo de busca em linguagem natural.

        Returns:
            Vetor 1D numpy normalizado.
        """
        if self._model is None:
            self.warmup()

        assert self._model is not None
        vector = self._model.encode(
            query,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return np.asarray(vector, dtype=np.float32)


def get_embedding_model() -> EmbeddingModelManager:
    """Função de conveniência para obter a instância singleton do modelo de embeddings."""
    return EmbeddingModelManager.get_instance()
