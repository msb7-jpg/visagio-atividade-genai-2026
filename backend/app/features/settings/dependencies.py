from typing import Annotated

from fastapi import Depends

from app.features.settings.service import SettingsService, get_settings_service

SettingsSvc = Annotated[SettingsService, Depends(get_settings_service)]
