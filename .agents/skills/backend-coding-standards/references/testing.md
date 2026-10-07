# Reference: Backend Testing, Mocks, and Fixtures (Python 3.12+ & FastAPI)

This guide directs the creation of high-reliability, fast, and deterministic test suites using `pytest`, `pytest-asyncio`, and `httpx.AsyncClient`.

---

## 1. Testing Principles

1. **Unit Tests:** Test services, business logic, and utility functions in isolation, mocking repositories and external clients via DI (`__init__`).
2. **Integration Tests:** Test full endpoints via `httpx.AsyncClient`, replacing real dependencies (such as database and LLM providers) using `app.dependency_overrides`.
3. **Determinism and Isolation:** Each test must run independently without sharing mutable state or production database records.

---

## 2. Dependency Injection in Tests (`app.dependency_overrides`)

FastAPI provides a native and canonical way to intercept any dependency injected via `Depends`:

```python
# tests/conftest.py
import pytest
from collections.abc import AsyncGenerator
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.dependencies import get_db
from main import app

# In-memory asynchronous SQLite engine for tests
test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        yield session


@pytest.fixture(autouse=True)
def setup_dependency_overrides():
    """Register dependency overrides before tests and clean up afterward."""
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Asynchronous HTTP client for testing endpoints without spinning up a live server."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
```

---

## 3. Pure Python Service Unit Tests

Because services receive dependencies via their `__init__` constructor, unit tests do not require FastAPI or a database:

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

## 4. Ruff Rules for Tests (`PT`)

With `PT` (flake8-pytest-style) enabled in `pyproject.toml`:
- Use `@pytest.fixture()` explicitly with parentheses.
- Avoid compound assertions that obscure failures; use descriptive error messages with `assert condition, "reason"`.
- Prefer `@pytest.mark.parametrize` for testing input variants and edge cases rather than duplicating test functions.
