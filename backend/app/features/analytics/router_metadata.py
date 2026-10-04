"""Metadados OpenAPI isolados com EndpointDoc para o router de analytics."""

from app.shared.docs import EndpointDoc

get_suggestions_doc = EndpointDoc(
    summary="Listar catálogo de perguntas sugeridas",
    description=(
        "Retorna o catálogo oficial categorizado de prompts e perguntas do CineData, "
        "abrangendo consultas canônicas do desafio (Text-to-SQL), visualizações com Chart.js, "
        "buscas semânticas híbridas (RAG) e assistência geral."
    ),
    response_description="Catálogo de sugestões retornado com sucesso.",
)

get_schema_summary_doc = EndpointDoc(
    summary="Resumo estatístico do esquema analítico do Lakehouse",
    description=(
        "Retorna a contagem de registros das 10 tabelas da camada Gold do cinerocket.db "
        "e o total de documentos indexados no repositório vetorial de embeddings."
    ),
    response_description="Metadados do esquema e contagens retornados com sucesso.",
)

get_movie_detail_doc = EndpointDoc(
    summary="Obter detalhes de um filme para o card cinemático",
    description=(
        "Retorna sinopse, poster oficial, backdrop, notas IMDb/TMDB, métricas de bilheteria/lucro em BRL, "
        "gêneros e diretores para renderização no Tooltip Card cinemático ao passar o mouse sobre o título."
    ),
    response_description="Detalhes do filme retornados com sucesso.",
)

