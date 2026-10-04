"""DTOs Pydantic para o slice de Analytics e Catálogo de Sugestões."""

from pydantic import BaseModel, Field


class PromptSuggestionDTO(BaseModel):
    """Representação de um prompt individual sugerido no catálogo."""

    title: str = Field(..., description="Título curto e autoexplicativo da sugestão")
    prompt: str = Field(..., description="Texto completo do prompt em linguagem natural")
    sub_category: str | None = Field(default=None, description="Subcategoria temática (ex: Finanças, Crítica)")
    icon_name: str | None = Field(default=None, description="Nome do ícone Lucide sugerido")


class CategoryPromptsDTO(BaseModel):
    """Categoria agrupada de prompts sugeridos."""

    id: str = Field(..., description="Identificador único da categoria (slug)")
    label: str = Field(..., description="Rótulo legível da categoria")
    badge: str = Field(..., description="Badge identificador (ex: Text-to-SQL, Chart.js, RAG)")
    description: str = Field(..., description="Descrição resumida do objetivo da categoria")
    icon_name: str = Field(..., description="Identificador do ícone principal")
    prompts: list[PromptSuggestionDTO] = Field(default_factory=list, description="Lista de prompts sugeridos")


class SuggestionsCatalogResponseDTO(BaseModel):
    """Resposta com todas as categorias de prompts sugeridos."""

    categories: list[CategoryPromptsDTO] = Field(..., description="Categorias disponíveis no catálogo")
    total_prompts: int = Field(..., description="Total de sugestões cadastradas")


class TableSummaryDTO(BaseModel):
    """Resumo estatístico de uma tabela do cinerocket.db."""

    table_name: str = Field(..., description="Nome da tabela no SQLite")
    row_count: int = Field(..., description="Quantidade total de registros")
    description: str = Field(..., description="Propósito e semântica de negócio da tabela")


class DatabaseSchemaSummaryDTO(BaseModel):
    """Metadados e contagens consolidadas da camada Gold do cinerocket.db."""

    database_name: str = Field(default="cinerocket.db", description="Nome do banco analítico")
    mode: str = Field(default="READ_ONLY", description="Modo de conexão estrito do driver")
    tables: list[TableSummaryDTO] = Field(default_factory=list, description="Resumo das tabelas do Lakehouse")
    indexed_movies: int = Field(..., description="Filmes indexados na base vetorial RAG")
    indexed_reviews: int = Field(..., description="Resenhas indexadas na base vetorial RAG")


class MovieDetailDTO(BaseModel):
    """Detalhes completos de um filme para o card cinemático interativo."""

    sk_movie_id: str = Field(..., description="Surrogate key do filme")
    id_filme: str | None = Field(default=None, description="Identificador de negócio/origem do filme")
    titulo: str = Field(..., description="Título oficial do filme")
    ano_lancamento: int | None = Field(default=None, description="Ano de lançamento")
    duracao_minutos: int | None = Field(default=None, description="Duração total em minutos")
    status_filme: str | None = Field(default=None, description="Status de produção/lançamento")
    sinopse: str | None = Field(default=None, description="Sinopse oficial")
    url_poster: str | None = Field(default=None, description="URL do pôster oficial (TMDB)")
    url_backdrop: str | None = Field(default=None, description="URL do banner de fundo")
    generos: list[str] = Field(default_factory=list, description="Lista de gêneros associados")
    diretores: list[str] = Field(default_factory=list, description="Lista de diretores do filme")
    nota_imdb: float | None = Field(default=None, description="Nota média no IMDb")
    qtd_imdb: int | None = Field(default=None, description="Quantidade de votos no IMDb")
    nota_tmdb: float | None = Field(default=None, description="Nota média no TMDB")
    qtd_tmdb: int | None = Field(default=None, description="Quantidade de votos no TMDB")
    receita_brl: float | None = Field(default=None, description="Receita convertida em BRL")
    orcamento_brl: float | None = Field(default=None, description="Orçamento convertido em BRL")
    lucro_brl: float | None = Field(default=None, description="Lucro consolidado em BRL")

