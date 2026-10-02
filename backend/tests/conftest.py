import pytest
from pathlib import Path
from unittest.mock import patch

from app.core.config import Settings, get_settings


@pytest.fixture
def test_settings() -> Settings:
    """Fixture fornecendo configurações com caminho resolvido para teste."""
    return get_settings()


@pytest.fixture(autouse=True)
def isolate_test_settings_db(tmp_path: Path):
    """Garante que nenhum teste sobrescreva o banco real app_settings.db."""
    test_db = tmp_path / "test_app_settings.db"
    with patch("app.db.settings_db.get_settings_db_path", return_value=test_db):
        yield test_db
