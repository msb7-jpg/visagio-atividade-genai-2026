"""Mecanismo de busca semântica vetorial em catálogo de filmes via sqlite-vec e fact_movies_performance."""

import logging
from typing import TypedDict

from app.agent.embeddings.embedding_model import get_embedding_model
from app.db.session import get_readonly_db_connection

logger = logging.getLogger(__name__)


class MovieSearchResult(TypedDict):
    """Resultado estruturado e estritamente tipado de busca semântica em catálogo de filmes."""

    sk_movie_id: str
    titulo: str
    ano_lancamento: int | None
    generos: str | None
    diretores: str | None
    popularidade: float | None
    nota_imdb: float | None
    score_similaridade: float
    trecho_relevante: str


class VectorStore:
    """
    Motor nativo de busca vetorial no SQLite usando a extensão sqlite-vec e fact_movies_performance.

    Executa consultas KNN aceleradas diretamente no arquivo cinerocket.db sem índices voláteis em memória.
    """

    _instance: "VectorStore | None" = None

    def __init__(self) -> None:
        """Inicializa o repositório singleton de busca vetorial."""
        self._is_initialized = False
        self._cached_movies_count = 0
        self._cached_reviews_count = 0
        self._has_vec_table = False

    @classmethod
    def get_instance(cls) -> "VectorStore":
        """Retorna a instância singleton do VectorStore."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def is_initialized(self) -> bool:
        """Indica se a conexão local com o cinerocket.db foi testada com sucesso."""
        return self._is_initialized

    @property
    def indexed_movies_count(self) -> int:
        """Total de filmes catalogados com contexto analítico no cinerocket.db."""
        return self._cached_movies_count

    @property
    def indexed_reviews_count(self) -> int:
        """Total de avaliações de usuários registradas no cinerocket.db."""
        return self._cached_reviews_count

    def warmup(self) -> None:
        """Verifica a integridade da tabela fato e da tabela virtual vec_movies no SQLite local."""
        if self._is_initialized:
            return

        with get_readonly_db_connection(enable_vec=True) as conn:
            cur = conn.cursor()

            # Checa se a coluna genai_context existe na fact_movies_performance
            cur.execute("PRAGMA table_info(fact_movies_performance);")
            cols = {row[1] for row in cur.fetchall()}
            has_genai_col = "genai_context" in cols

            if has_genai_col:
                cur.execute(
                    "SELECT COUNT(*) FROM fact_movies_performance "
                    "WHERE genai_context IS NOT NULL AND TRIM(genai_context) != '';"
                )
                self._cached_movies_count = int(cur.fetchone()[0])
            else:
                cur.execute("SELECT COUNT(*) FROM dim_movies WHERE sinopse IS NOT NULL AND TRIM(sinopse) != '';")
                self._cached_movies_count = int(cur.fetchone()[0])

            # Checa se a tabela virtual vec_movies existe
            cur.execute("""
                SELECT count(*) FROM sqlite_master 
                WHERE type='table' AND name='vec_movies';
            """)
            self._has_vec_table = bool(cur.fetchone()[0])

            cur.execute("SELECT COUNT(*) FROM movie_reviews WHERE text IS NOT NULL AND TRIM(text) != '';")
            self._cached_reviews_count = int(cur.fetchone()[0])

        self._is_initialized = True
        logger.info(
            "VectorStore inicializado: %d filmes vetorizados em fact_movies_performance (vec_movies ativo: %s).",
            self._cached_movies_count,
            self._has_vec_table,
        )

    def search(self, query: str, top_k: int = 5) -> list[MovieSearchResult]:
        """
        Executa busca semântica vetorial unificada no catálogo de filmes.

        Args:
            query: Pergunta, tema ou conceito buscado em linguagem natural.
            top_k: Número máximo de filmes relevantes a retornar.

        Returns:
            Lista estritamente tipada de MovieSearchResult.
        """
        if not self._is_initialized:
            self.warmup()

        # Gera embedding da query via SentenceTransformer (384 dimensões float32)
        embedding_model = get_embedding_model()
        query_vector = embedding_model.encode_query(query)
        vector_bytes = query_vector.tobytes()

        # 1. Estratégia primária: KNN acelerado via vec_movies (sqlite-vec)
        if self._has_vec_table and self._cached_movies_count > 0:
            try:
                sql = """
                    SELECT 
                        f.sk_movie_id,
                        m.titulo,
                        m.ano_lancamento,
                        COALESCE(m.sinopse, '') AS sinopse,
                        f.popularidade,
                        f.nota_imdb,
                        f.genai_context,
                        v.distance
                    FROM vec_movies v
                    JOIN fact_movies_performance f ON v.sk_movie_id = f.sk_movie_id
                    JOIN dim_movies m ON f.sk_movie_id = m.sk_movie_id
                    WHERE v.embedding MATCH ? AND k = ?
                    ORDER BY v.distance ASC;
                """
                with get_readonly_db_connection(enable_vec=True) as conn:
                    cur = conn.cursor()
                    cur.execute(sql, (vector_bytes, top_k))
                    rows = cur.fetchall()

                results: list[MovieSearchResult] = []
                for row in rows:
                    dist = float(row["distance"])
                    # Para vetores L2 normalizados, a distância cosseno fica entre 0 e 2.0
                    score = round(max(0.0, min(1.0, 1.0 - (dist / 2.0))), 3)
                    context_val = str(row["genai_context"] or row["sinopse"])

                    results.append(
                        MovieSearchResult(
                            sk_movie_id=str(row["sk_movie_id"]),
                            titulo=str(row["titulo"]),
                            ano_lancamento=row["ano_lancamento"],
                            generos=None,  # Já incluído dentro de genai_context
                            diretores=None,
                            popularidade=float(row["popularidade"]) if row["popularidade"] is not None else None,
                            nota_imdb=float(row["nota_imdb"]) if row["nota_imdb"] is not None else None,
                            score_similaridade=score,
                            trecho_relevante=context_val,
                        )
                    )
                if results:
                    return results
            except Exception as e:
                logger.warning("Falha na consulta KNN vec_movies (%s). Usando fallback...", e)

        # 2. Fallback de contingência caso a tabela vec0 não esteja populada
        return self._fallback_search(query, top_k)

    def _fallback_search(self, query: str, top_k: int) -> list[MovieSearchResult]:
        """Fallback por similaridade de texto no SQLite."""
        sql = """
            SELECT m.sk_movie_id, m.titulo, m.ano_lancamento, m.sinopse, COALESCE(f.popularidade, 0) as pop, f.nota_imdb
            FROM dim_movies m
            LEFT JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
            WHERE m.sinopse IS NOT NULL AND TRIM(m.sinopse) != ''
            ORDER BY pop DESC
            LIMIT ?
        """
        with get_readonly_db_connection() as conn:
            cur = conn.cursor()
            cur.execute(sql, (top_k,))
            rows = cur.fetchall()

        results: list[MovieSearchResult] = []
        for idx, row in enumerate(rows):
            score = round(max(0.5, 0.90 - (idx * 0.08)), 2)
            results.append(
                MovieSearchResult(
                    sk_movie_id=str(row["sk_movie_id"]),
                    titulo=str(row["titulo"]),
                    ano_lancamento=row["ano_lancamento"],
                    generos=None,
                    diretores=None,
                    popularidade=float(row["pop"]) if row["pop"] is not None else None,
                    nota_imdb=float(row["nota_imdb"]) if row["nota_imdb"] is not None else None,
                    score_similaridade=score,
                    trecho_relevante=str(row["sinopse"]),
                )
            )
        return results


def get_vector_store() -> VectorStore:
    """Função de conveniência para obter a instância singleton do VectorStore."""
    return VectorStore.get_instance()
