import logging

from app.core.config import get_settings
from app.db.settings_db import (
    get_active_provider_config,
    get_active_provider_config_sync,
    get_all_saved_providers,
    get_all_user_provider_configs,
    get_user_provider_config,
    save_user_provider_config,
)
from app.features.settings.probe_service import ProviderProbeService
from app.features.settings.schemas import (
    ProviderConfigDTO,
    SavedProviderSummaryDTO,
    TestProviderRequestDTO,
    TestProviderResponseDTO,
)
from app.features.settings.security import mask_api_key

logger = logging.getLogger(__name__)


class SettingsService:
    """
    Gerencia a configuração ativa de provedores e a persistência SQLite.
    Delega testes de conectividade ao ProviderProbeService e mascaramento ao security.py.
    """

    def __init__(self, user_id: str = "default_user") -> None:
        """
        Inicializa o serviço de configurações para o usuário especificado.

        Args:
            user_id: Identificador de usuário para o qual carregar preferências salvas.
        """
        self.user_id = user_id
        active = get_active_provider_config_sync(self.user_id)
        if active:
            self._current_config = ProviderConfigDTO(
                provider=active["provider"],
                model=active["model"],
                api_key=active["api_key"],
                base_url=active["base_url"],
                timeout_seconds=active.get("timeout_seconds", 30),
                saved_providers=[],
                saved_configs={},
            )
            self._initialized_from_db = True
        else:
            settings = get_settings()
            self._current_config = ProviderConfigDTO(
                provider=settings.llm_provider,  # type: ignore[arg-type]
                model=settings.llm_model,
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
                timeout_seconds=settings.llm_timeout_seconds,
                saved_providers=[],
                saved_configs={},
            )
            self._initialized_from_db = False

    async def _ensure_db_loaded(self) -> None:
        """Carrega configuração inicial salva do banco caso exista."""
        if self._initialized_from_db:
            return

        try:
            saved = await get_active_provider_config(self.user_id)
            if saved:
                self._current_config = ProviderConfigDTO(
                    provider=saved["provider"],
                    model=saved["model"],
                    api_key=saved["api_key"],
                    base_url=saved["base_url"],
                    timeout_seconds=saved["timeout_seconds"],
                    saved_providers=[],
                    saved_configs={},
                )
            self._initialized_from_db = True
        except Exception as exc:
            logger.warning("Não foi possível carregar configurações iniciais do SQLite: %s", exc)

    async def get_current_config(self, masked: bool = True) -> ProviderConfigDTO:
        """
        Retorna a configuração ativa e a lista de provedores salvos no SQLite com detalhes mascarados.

        Args:
            masked: Se True, oculta a chave de API substituindo por máscara de segurança.

        Returns:
            ProviderConfigDTO com a configuração ativa e mapa de configurações salvas.
        """
        await self._ensure_db_loaded()
        saved_providers = []
        saved_configs_map: dict[str, SavedProviderSummaryDTO] = {}
        try:
            saved_providers = await get_all_saved_providers(self.user_id)
            all_configs = await get_all_user_provider_configs(self.user_id)
            for prov_name, prov_data in all_configs.items():
                saved_configs_map[prov_name] = SavedProviderSummaryDTO(
                    model=prov_data.get("model", ""),
                    api_key=mask_api_key(prov_data.get("api_key")),
                    base_url=prov_data.get("base_url"),
                    timeout_seconds=prov_data.get("timeout_seconds", 30),
                )
        except Exception as exc:
            logger.warning("Erro ao consultar provedores salvos no SQLite: %s", exc)

        return ProviderConfigDTO(
            provider=self._current_config.provider,
            model=self._current_config.model,
            api_key=mask_api_key(self._current_config.api_key) if masked else self._current_config.api_key,
            base_url=self._current_config.base_url,
            timeout_seconds=self._current_config.timeout_seconds,
            saved_providers=saved_providers,
            saved_configs=saved_configs_map,
        )

    async def update_config(self, new_config: ProviderConfigDTO) -> ProviderConfigDTO:
        """
        Atualiza a configuração em memória e persiste no SQLite.

        Args:
            new_config: Novos parâmetros de provedor, modelo e chave a serem salvos.

        Returns:
            ProviderConfigDTO atualizado com chave mascarada para exibição.
        """
        await self._ensure_db_loaded()
        updated_key = new_config.api_key

        if updated_key and ("..." in updated_key or updated_key == "********"):
            saved_prov = await get_user_provider_config(self.user_id, new_config.provider)
            if saved_prov and saved_prov.get("api_key"):
                updated_key = saved_prov["api_key"]
            elif self._current_config.provider == new_config.provider:
                updated_key = self._current_config.api_key

        self._current_config = ProviderConfigDTO(
            provider=new_config.provider,
            model=new_config.model,
            api_key=updated_key,
            base_url=new_config.base_url,
            timeout_seconds=new_config.timeout_seconds,
            saved_providers=[],
            saved_configs={},
        )

        try:
            await save_user_provider_config(
                user_id=self.user_id,
                provider=new_config.provider,
                model=new_config.model,
                api_key=updated_key,
                base_url=new_config.base_url,
                timeout_seconds=new_config.timeout_seconds,
            )
        except Exception as exc:
            logger.error("Falha ao salvar configuração de modelo no banco SQLite: %s", exc)

        return await self.get_current_config(masked=True)

    async def test_provider(self, request: TestProviderRequestDTO) -> TestProviderResponseDTO:
        """
        Delega teste de conectividade ao ProviderProbeService.

        Args:
            request: Parâmetros do teste de conectividade e timeout.

        Returns:
            TestProviderResponseDTO com resultado, tempo de resposta e modelos encontrados.
        """
        await self._ensure_db_loaded()
        return await ProviderProbeService.test_provider(self.user_id, request)


_global_settings_service: SettingsService | None = None


def get_settings_service() -> SettingsService:
    """
    Fornece a instância singleton de SettingsService utilizada na injeção de dependências FastAPI.

    Returns:
        Instância compartilhada de SettingsService.
    """
    global _global_settings_service
    if _global_settings_service is None:
        _global_settings_service = SettingsService()
    return _global_settings_service
