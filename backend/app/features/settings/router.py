from fastapi import APIRouter, Depends

from app.features.settings.router_metadata import (
    get_provider_doc,
    test_provider_doc,
    update_provider_doc,
)
from app.features.settings.schemas import (
    ProviderConfigDTO,
    TestProviderRequestDTO,
    TestProviderResponseDTO,
)
from app.features.settings.service import SettingsService, get_settings_service

router = APIRouter(prefix="/settings", tags=["Settings & Provedores de IA"])


@router.get(
    "/provider",
    response_model=ProviderConfigDTO,
    summary=get_provider_doc.summary,
    description=get_provider_doc.description,
    response_description=get_provider_doc.response_description,
)
async def get_provider(
    service: SettingsService = Depends(get_settings_service),
) -> ProviderConfigDTO:
    return await service.get_current_config(masked=True)


@router.post(
    "/provider",
    response_model=ProviderConfigDTO,
    summary=update_provider_doc.summary,
    description=update_provider_doc.description,
    response_description=update_provider_doc.response_description,
)
async def update_provider(
    config: ProviderConfigDTO,
    service: SettingsService = Depends(get_settings_service),
) -> ProviderConfigDTO:
    return await service.update_config(config)



@router.post(
    "/test-provider",
    response_model=TestProviderResponseDTO,
    summary=test_provider_doc.summary,
    description=test_provider_doc.description,
    response_description=test_provider_doc.response_description,
)
async def test_provider(
    request: TestProviderRequestDTO,
    service: SettingsService = Depends(get_settings_service),
) -> TestProviderResponseDTO:
    return await service.test_provider(request)
