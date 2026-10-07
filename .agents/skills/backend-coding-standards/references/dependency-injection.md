# Reference: Dependency Injection (DI) Patterns in FastAPI

This guide details the 4-level dependency injection hierarchy adopted for production-grade FastAPI projects.

---

## 1. The Canonical 4-Level Hierarchy

```python
# core/dependencies.py
from typing import Annotated
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

# --------------------------------------------------------------------------
# Level 1: Infrastructure Singletons
# Initialized once during the `lifespan` cycle and stored in `app.state`.
# Examples: DB Engine, Redis Pool, persistent HTTP clients (httpx.AsyncClient).
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# Level 2: Per-Request Dependencies
# Pull resources from app.state with a deterministic yield for cleanup.
# --------------------------------------------------------------------------
async def get_db(request: Request) -> AsyncSession:
    async with request.app.state.db_session_factory() as session:
        yield session

DBSession = Annotated[AsyncSession, Depends(get_db)]

# --------------------------------------------------------------------------
# Level 3: Service Factories
# Compose infrastructure and repositories into pure domain services.
# --------------------------------------------------------------------------
async def get_order_service(db: DBSession) -> OrderService:
    return OrderService(repository=OrderRepository(db))

OrderSvc = Annotated[OrderService, Depends(get_order_service)]

# --------------------------------------------------------------------------
# Level 4: Class-Based Cross-Cutting Dependencies
# Rate limiting, auditing, token authentication, feature flags.
# --------------------------------------------------------------------------
class RateLimiter:
    def __init__(self, requests: int, window: int) -> None:
        self.requests = requests
        self.window = window

    async def __call__(self, request: Request) -> None:
        # Verification logic...
        pass

def get_rate_limiter() -> RateLimiter:
    return RateLimiter(requests=100, window=60)

RateLimited = Annotated[None, Depends(get_rate_limiter)]
```

---

## 2. Core DI Design Rules

| Rule | Why? |
|---|---|
| **Use `Annotated[T, Depends(fn)]`** | Keeps route function signatures clean, readable, and reusable without repeating `Depends`. |
| **`yield` for Resources Requiring Teardown** | Database sessions, distributed locks, or streams that require guaranteed cleanup via `finally`. |
| **Injection via `__init__`, Never Globals** | Enables instantiating services with test doubles/mocks in unit tests without requiring the FastAPI framework. |
| **Injection Depth $\le 3$** | Maximum allowed dependency chain in a route is `route → service → repo`. Deeper chains must be flattened. |
| **`app.dependency_overrides` in Tests** | Swaps out any dependency with in-memory implementations without modifying production code. |

---

## 3. Usage in Routes

When using type aliases with `Annotated`, route signatures remain concise and intuitive:

```python
# features/orders/router.py
from fastapi import APIRouter
from core.dependencies import OrderSvc, RateLimited
from features.orders.schemas import OrderCreateRequest, OrderResponse

router = APIRouter()

@router.post(
    "/orders",
    response_model=OrderResponse,
    dependencies=[RateLimited], # Cross-cutting dependency executed before route handler
)
async def create_order(
    payload: OrderCreateRequest,
    service: OrderSvc, # Domain service injected with its repository and session ready
) -> OrderResponse:
    return await service.create_order(payload)
```

---

## 4. Overriding in Tests (Dependency Overrides)

```python
# tests/conftest.py
import pytest
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from core.dependencies import get_db
from main import app

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        yield session

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
```

---

## 5. References and Official Reading

- [FastAPI Dependency Injection Tutorial](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [FastAPI Dependencies with yield (Cleanup)](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/)
- [Testing Dependencies with Overrides](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [PEP 593 – Flexible function and variable annotations (Annotated)](https://peps.python.org/pep-0593/)
