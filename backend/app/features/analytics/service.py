"""Serviço de dados analíticos, estatísticas de Lakehouse e catálogo de sugestões."""

import logging

from app.agent.embeddings.vector_store import get_vector_store
from app.db.session import get_readonly_db_connection
from app.features.analytics.catalog_data import CANONICAL_PROMPT_CATEGORIES
from app.features.analytics.schemas import (
    DatabaseSchemaSummaryDTO,
    MovieDetailDTO,
    SuggestionsCatalogResponseDTO,
    TableSummaryDTO,
)
from app.shared.exceptions import ResourceNotFoundError

logger = logging.getLogger(__name__)

TABLE_DESCRIPTIONS: dict[str, str] = {
    "dim_movies": "Catálogo central dimensional de filmes (títulos, sinopses, duração, ano).",
    "fact_movies_performance": "Fato de métricas financeiras (orçamento, receita, lucro) e notas TMDB/IMDb.",
    "dim_people": "Artistas, atores, diretores e roteiristas catalogados.",
    "bridge_movie_person": "Relação N:N associando filmes aos seus elencos e diretores.",
    "dim_genres": "Categorias e gêneros cinematográficos padronizados em inglês.",
    "bridge_movie_genre": "Relação N:N mapeando filmes para seus múltiplos gêneros.",
    "dim_companies": "Estúdios de produção e distribuidoras cinematográficas.",
    "bridge_movie_company": "Relação N:N mapeando filmes para suas produtoras associadas.",
    "dim_reviews": "Métricas agregadas de avaliações dos usuários do portal CineData.",
    "movie_reviews": "Resenhas textuais granulares em português e notas atribuídas por usuários.",
}


class AnalyticsService:
    """Provedor de informações analíticas, esquemas e catálogo de prompts do CineData."""

    def get_suggestions_catalog(self) -> SuggestionsCatalogResponseDTO:
        """
        Retorna o catálogo completo de perguntas sugeridas divididas em categorias.

        Returns:
            SuggestionsCatalogResponseDTO com categorias de prompts e contagem total.
        """
        total = sum(len(cat.prompts) for cat in CANONICAL_PROMPT_CATEGORIES)
        return SuggestionsCatalogResponseDTO(
            categories=CANONICAL_PROMPT_CATEGORIES,
            total_prompts=total,
        )

    def get_database_schema_summary(self) -> DatabaseSchemaSummaryDTO:
        """
        Retorna as contagens de linhas de cada tabela da camada Gold e status da base vetorial.

        Returns:
            DatabaseSchemaSummaryDTO estruturado.
        """
        tables_summary: list[TableSummaryDTO] = []

        with get_readonly_db_connection() as conn:
            cur = conn.cursor()
            for tbl, desc in TABLE_DESCRIPTIONS.items():
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {tbl}")  # ruff: ignore[hardcoded-sql-expression] - tabela fixa da whitelist
                    count = cur.fetchone()[0]
                    tables_summary.append(TableSummaryDTO(table_name=tbl, row_count=count, description=desc))
                except Exception as exc:
                    logger.warning("Falha ao contar registros da tabela %s: %s", tbl, exc)

        vector_store = get_vector_store()
        indexed_movies = vector_store.indexed_movies_count if vector_store.is_initialized else 0
        indexed_reviews = vector_store.indexed_reviews_count if vector_store.is_initialized else 0

        return DatabaseSchemaSummaryDTO(
            database_name="cinerocket.db",
            mode="READ_ONLY",
            tables=tables_summary,
            indexed_movies=indexed_movies,
            indexed_reviews=indexed_reviews,
        )

    def get_movie_details(self, movie_id: str) -> "MovieDetailDTO":
        """
        Retorna os dados cadastrais, métricas financeiras, notas, gêneros e diretores de um filme.
        Permite consulta por sk_movie_id, id_filme ou título exato/normalizado do filme como fallback resiliente.

        Args:
            movie_id: Surrogate key (sk_movie_id), ID de origem (id_filme) ou título do filme.

        Returns:
            MovieDetailDTO estruturado com dados do filme.

        Raises:
            ResourceNotFoundError: Se o filme não for encontrado.
        """
        identifier = movie_id.strip()
        # Normaliza variações unicode comuns como hífens não-quebráveis (U+2011, etc.)
        normalized_title = identifier.replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")

        with get_readonly_db_connection() as conn:
            cur = conn.cursor()

            # 1. Tentativa primária: por chave exata (sk_movie_id, id_filme ou título exato)
            cur.execute(
                """
                SELECT m.sk_movie_id, m.id_filme, m.titulo, m.ano_lancamento, m.duracao_minutos,
                       m.status_filme, m.sinopse, m.url_poster, m.url_backdrop,
                       f.nota_imdb, f.qtd_imdb, f.nota_tmdb, f.qtd_tmdb,
                       f.receita_brl, f.orcamento_brl, f.lucro_brl
                FROM dim_movies m
                LEFT JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
                WHERE m.sk_movie_id = ? 
                   OR m.id_filme = ? 
                   OR LOWER(m.titulo) = LOWER(?)
                   OR LOWER(m.titulo) = LOWER(?)
                ORDER BY f.receita_brl DESC
                LIMIT 1
                """,
                (identifier, identifier, identifier, normalized_title),
            )
            row = cur.fetchone()

            # 2. Fallback resiliente: caso tenha vindo o nome parcial ou com pontuação levemente diferente
            if not row and len(normalized_title) >= 3:
                cur.execute(
                    """
                    SELECT m.sk_movie_id, m.id_filme, m.titulo, m.ano_lancamento, m.duracao_minutos,
                           m.status_filme, m.sinopse, m.url_poster, m.url_backdrop,
                           f.nota_imdb, f.qtd_imdb, f.nota_tmdb, f.qtd_tmdb,
                           f.receita_brl, f.orcamento_brl, f.lucro_brl
                    FROM dim_movies m
                    LEFT JOIN fact_movies_performance f ON m.sk_movie_id = f.sk_movie_id
                    WHERE LOWER(m.titulo) LIKE ?
                    ORDER BY f.receita_brl DESC
                    LIMIT 1
                    """,
                    (f"%{normalized_title}%",),
                )
                row = cur.fetchone()

            if not row:
                raise ResourceNotFoundError(resource="Filme", identifier=movie_id)

            (
                sk_movie_id,
                id_filme,
                titulo,
                ano_lancamento,
                duracao_minutos,
                status_filme,
                sinopse,
                url_poster,
                url_backdrop,
                nota_imdb,
                qtd_imdb,
                nota_tmdb,
                qtd_tmdb,
                receita_brl,
                orcamento_brl,
                lucro_brl,
            ) = row

            # Buscar gêneros
            cur.execute(
                """
                SELECT g.nome_genero
                FROM bridge_movie_genre b
                JOIN dim_genres g ON b.sk_genre_id = g.sk_genre_id
                WHERE b.sk_movie_id = ?
                ORDER BY g.nome_genero ASC
                """,
                (sk_movie_id,),
            )
            generos = [r[0] for r in cur.fetchall() if r[0]]

            # Buscar diretores
            cur.execute(
                """
                SELECT p.nome_pessoa
                FROM bridge_movie_person bp
                JOIN dim_people p ON bp.sk_person_id = p.sk_person_id
                WHERE bp.sk_movie_id = ? AND p.tipo_pessoa = 'Diretor'
                ORDER BY p.nome_pessoa ASC
                """,
                (sk_movie_id,),
            )
            diretores = [r[0] for r in cur.fetchall() if r[0]]

            return MovieDetailDTO(
                sk_movie_id=sk_movie_id,
                id_filme=id_filme,
                titulo=titulo,
                ano_lancamento=ano_lancamento,
                duracao_minutos=duracao_minutos,
                status_filme=status_filme,
                sinopse=sinopse,
                url_poster=url_poster,
                url_backdrop=url_backdrop,
                generos=generos,
                diretores=diretores,
                nota_imdb=float(nota_imdb) if nota_imdb is not None else None,
                qtd_imdb=int(qtd_imdb) if qtd_imdb is not None else None,
                nota_tmdb=float(nota_tmdb) if nota_tmdb is not None else None,
                qtd_tmdb=int(qtd_tmdb) if qtd_tmdb is not None else None,
                receita_brl=float(receita_brl) if receita_brl is not None else None,
                orcamento_brl=float(orcamento_brl) if orcamento_brl is not None else None,
                lucro_brl=float(lucro_brl) if lucro_brl is not None else None,
            )


def get_analytics_service() -> AnalyticsService:
    """Factory para injeção de dependência do serviço de dados analíticos."""
    return AnalyticsService()

