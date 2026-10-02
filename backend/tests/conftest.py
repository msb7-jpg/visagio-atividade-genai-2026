import pytest

from app.core.config import Settings, get_settings


@pytest.fixture
def test_settings() -> Settings:
    """Fixture fornecendo configurações com caminho resolvido para teste."""
    return get_settings()
