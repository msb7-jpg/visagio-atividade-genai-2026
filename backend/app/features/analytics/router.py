from fastapi import APIRouter, HTTPException, status

from app.features.analytics.router_metadata import (
    get_movie_detail_doc,
    get_schema_summary_doc,
    get_suggestions_doc,
)
from app.features.analytics.schemas import (
    DatabaseSchemaSummaryDTO,
    MovieDetailDTO,
    SuggestionsCatalogResponseDTO,
)
from app.features.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics & Catalog"])


@router.get(
    "/suggestions",
    response_model=SuggestionsCatalogResponseDTO,
    status_code=status.HTTP_200_OK,
    summary=get_suggestions_doc.summary,
    description=get_suggestions_doc.description,
    response_description=get_suggestions_doc.response_description,
)
async def get_suggestions_catalog() -> SuggestionsCatalogResponseDTO:
    """Retorna o catálogo de sugestões de prompts categorizados."""
    return AnalyticsService.get_suggestions_catalog()


@router.get(
    "/schema",
    response_model=DatabaseSchemaSummaryDTO,
    status_code=status.HTTP_200_OK,
    summary=get_schema_summary_doc.summary,
    description=get_schema_summary_doc.description,
    response_description=get_schema_summary_doc.response_description,
)
async def get_database_schema_summary() -> DatabaseSchemaSummaryDTO:
    """Retorna o resumo estatístico das tabelas e do repositório vetorial."""
    return AnalyticsService.get_database_schema_summary()


@router.get(
    "/movies/{movie_id}",
    response_model=MovieDetailDTO,
    status_code=status.HTTP_200_OK,
    summary=get_movie_detail_doc.summary,
    description=get_movie_detail_doc.description,
    response_description=get_movie_detail_doc.response_description,
)
async def get_movie_detail(movie_id: str) -> MovieDetailDTO:
    """Retorna os detalhes cadastrais, financeiros e notas de um filme."""
    detail = AnalyticsService.get_movie_details(movie_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Filme com identificador '{movie_id}' não encontrado no catálogo.",
        )
    return detail

