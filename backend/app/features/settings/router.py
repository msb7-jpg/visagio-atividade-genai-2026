from fastapi import APIRouter

from app.features.settings.dependencies import SettingsSvc
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

router = APIRouter(prefix="/settings", tags=["Settings & Provedores de IA"])


@router.get(
    "/provider",
    response_model=ProviderConfigDTO,
    **get_provider_doc.to_dict(),
)
async def get_provider(service: SettingsSvc) -> ProviderConfigDTO:
    return await service.get_current_config(masked=True)


@router.post(
    "/provider", 
    response_model=ProviderConfigDTO, 
    **update_provider_doc.to_dict()
)
async def update_provider(
    config: ProviderConfigDTO,
    service: SettingsSvc,
) -> ProviderConfigDTO:
    return await service.update_config(config)


@router.post(
    "/test-provider",
    response_model=TestProviderResponseDTO,
    **test_provider_doc.to_dict(),
)
async def probe_provider_endpoint(
    request: TestProviderRequestDTO,
    service: SettingsSvc,
) -> TestProviderResponseDTO:
    return await service.test_provider(request)
