from fastapi import APIRouter, status

from app.features.analytics.dependencies import AnalyticsSvc
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

router = APIRouter(prefix="/analytics", tags=["Analytics & Catalog"])


@router.get(
    "/suggestions",
    response_model=SuggestionsCatalogResponseDTO,
    status_code=status.HTTP_200_OK,
    **get_suggestions_doc.to_dict(),
)
async def get_suggestions_catalog(service: AnalyticsSvc) -> SuggestionsCatalogResponseDTO:
    """Retorna o catálogo de sugestões de prompts categorizados."""
    return service.get_suggestions_catalog()


@router.get(
    "/schema",
    response_model=DatabaseSchemaSummaryDTO,
    status_code=status.HTTP_200_OK,
    **get_schema_summary_doc.to_dict(),
)
async def get_database_schema_summary(service: AnalyticsSvc) -> DatabaseSchemaSummaryDTO:
    """Retorna o resumo estatístico das tabelas e do repositório vetorial."""
    return service.get_database_schema_summary()


@router.get(
    "/movies/{movie_id}",
    response_model=MovieDetailDTO,
    status_code=status.HTTP_200_OK,
    **get_movie_detail_doc.to_dict(),
)
async def get_movie_detail(movie_id: str, service: AnalyticsSvc) -> MovieDetailDTO:
    """Retorna os detalhes cadastrais, financeiros e notas de um filme."""
    return service.get_movie_details(movie_id)

