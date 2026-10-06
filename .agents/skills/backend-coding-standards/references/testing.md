# Referência: Testes de Backend, Mocks e Fixtures (Python 3.12+ & FastAPI)

Este guia orienta a criação de suítes de teste de alta confiabilidade, rápidas e determinísticas utilizando `pytest`, `pytest-asyncio` e `httpx.AsyncClient`.

---

## 1. Princípios de Testes

1. **Testes Unitários:** Testam serviços, regras de negócio e funções de utilidade de forma isolada, mockando repositórios e clientes externos via DI (`__init__`).
2. **Testes de Integração:** Testam endpoints completos via `httpx.AsyncClient` substituindo dependências reais (como banco de dados e provedores de LLM) via `app.dependency_overrides`.
3. **Determinismo e Isolamento:** Cada teste deve rodar independentemente, sem compartilhar estado mutável ou dados em banco de produção.

---

## 2. Injeção de Dependência em Testes (`app.dependency_overrides`)

O FastAPI oferece uma maneira nativa e canônica de interceptar qualquer dependência injetada via `Depends`:

```python
# tests/conftest.py
import pytest
from collections.abc import AsyncGenerator
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.dependencies import get_db
from main import app

# Engine SQLite assíncrono em memória para testes
test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        yield session


@pytest.fixture(autouse=True)
def setup_dependency_overrides():
    """Registra overrides de dependências antes dos testes e limpa ao finalizar."""
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Cliente HTTP assíncrono para testar endpoints sem subir servidor real."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
```

---

## 3. Testes Unitários de Serviços (Pure Python)

Como os serviços recebem dependências via construtor `__init__`, testes unitários não precisam de FastAPI nem de banco de dados:

```python
from unittest.mock import AsyncMock
import pytest
from app.features.orders.service import OrderService
from app.features.orders.schemas import OrderCreate


@pytest.mark.asyncio
async def test_order_creation_calculates_total_and_saves():
    # Arrange
    mock_repo = AsyncMock()
    mock_pricing = AsyncMock()
    mock_notifier = AsyncMock()
    mock_inventory = AsyncMock()

    mock_pricing.calculate.return_value = 150.0
    mock_repo.save.return_value = {"id": 1, "total": 150.0}

    service = OrderService(
        pricing=mock_pricing,
        inventory=mock_inventory,
        notifier=mock_notifier,
        repository=mock_repo,
    )

    data = OrderCreate(customer_id="cust-123", items=[{"item_id": "item-1", "qty": 2}])

    # Act
    result = await service.create_order(data)

    # Assert
    mock_pricing.calculate.assert_awaited_once_with(data)
    mock_inventory.reserve.assert_awaited_once_with(data.items)
    mock_repo.save.assert_awaited_once()
    assert result["total"] == 150.0
```

---

## 4. Regras do Ruff para Testes (`PT`)

Com `PT` (flake8-pytest-style) ativo no `pyproject.toml`:
- Utilize `@pytest.fixture()` explicitamente com parênteses.
- Evite asserções compostas que escondam a falha; utilize mensagens de erro descritivas em `assert condition, "motivo"`.
- Prefira `@pytest.mark.parametrize` para testar variações de entrada e edge cases em vez de duplicar funções de teste.
