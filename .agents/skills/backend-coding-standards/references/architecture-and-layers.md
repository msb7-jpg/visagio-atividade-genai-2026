# Reference: Layered Architecture, Vertical Slices, and Separation of Concerns

This document guides folder structuring, architectural boundaries, and strict segregation between HTTP layers, business rules, and data access in FastAPI backends (Python 3.12+).

---

## 1. Vertical Slices Philosophy

Group code by semantic domain functionality (Vertical Slices / Features) rather than solely by technical file type. Each feature contains everything it needs to operate:

```text
backend/app/features/
├── orders/
│   ├── router.py       # HTTP transport layer
│   ├── service.py      # Pure business logic
│   ├── repository.py   # Database queries and persistence
│   ├── schemas.py      # Inbound and outbound DTOs (Pydantic V2)
│   └── exceptions.py   # Typed domain exceptions
└── customers/
    ├── router.py
    ├── ...
```

---

## 2. Strict Responsibilities by Layer

### 2.1 Thin Routers (Transport Layer)
- **Role:** Receive HTTP requests, extract parameters, validate inbound payloads via Pydantic, invoke the injected service facade, and map the response.
- **Strict Prohibition:** Routers **never** contain business logic, complex domain branching, or database queries.
- **Declarative OpenAPI Metadata (`EndpointDoc` + `**kwargs`):** Instead of polluting the router decorator with multiple literal keyword arguments (`summary="...", description="...", response_description="..."`), centralize endpoint documentation in an `EndpointDoc` object and unpack it with `**doc.to_dict()`:

```python
# app/shared/docs.py
from dataclasses import asdict, dataclass
from typing import Any

@dataclass(frozen=True, slots=True)
class EndpointDoc:
    """Immutable metadata for standardized OpenAPI/Swagger documentation."""

    summary: str
    description: str
    response_description: str = "Operation completed successfully"
    responses: dict[int | str, dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert metadata to a dictionary compatible with FastAPI decorator kwargs, omitting None values."""
        raw = asdict(self)
        return {key: value for key, value in raw.items() if value is not None}
```

Example of clean usage in the router:

```python
# app/features/orders/router_metadata.py
from app.shared.docs import EndpointDoc

create_order_doc = EndpointDoc(
    summary="Create new order",
    description="Registers an order and initiates the inventory reservation process.",
    response_description="Order created successfully.",
)

# app/features/orders/router.py
from fastapi import APIRouter, status
from app.features.orders.schemas import OrderCreateRequest, OrderResponse
from app.features.orders.dependencies import OrderSvc
from app.features.orders.router_metadata import create_order_doc

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    **create_order_doc.to_dict(), # ✅ Cleanly unpacks summary, description, and responses
)
async def create_order(
    payload: OrderCreateRequest,
    service: OrderSvc,
) -> OrderResponse:
    order = await service.create_order(payload)
    return OrderResponse.model_validate(order)
```

### 2.2 Pure Services (Domain Layer / Orchestration)
- **Role:** Encapsulate business logic, calculations, state transitions, and coordination of specialized dependencies.
- **Pure Python:** Service classes **must not import** anything from `fastapi` or `starlette` (e.g., `Request`, `Response`, `HTTPException`).
- **Constructor Injection:** Receive repositories and external clients via `__init__`, never through global variables.

```python
# app/features/orders/service.py
from app.features.orders.schemas import OrderCreateRequest
from app.features.orders.repository import OrderRepository
from app.features.orders.exceptions import OrderValidationError

class OrderService:
    def __init__(self, repository: OrderRepository) -> None:
        self.repository = repository

    async def create_order(self, data: OrderCreateRequest) -> dict:
        if not data.items:
            raise OrderValidationError("Order cannot be created without items")
        return await self.repository.create(data)
```

### 2.3 Repositories (Data Access Layer / Persistence)
- **Role:** Encapsulate query execution, filters, joins, and database operations (SQLAlchemy, SQLModel, SQLite, etc.).
- **ORM Isolation:** Only repositories know ORM details and session handling. Services consume high-level methods (`get_by_id`, `create`, `list_active`).

### 2.4 Pydantic Schemas at the Boundary
- All external communication (inbound and outbound JSON) uses Pydantic V2 schemas (`BaseModel`).
- **ORM Model Isolation:** Database models (e.g., SQLAlchemy `Base`) are never returned directly by API routers. Explicitly convert them to DTOs with `model_validate(from_attributes=True)`.

---

## 3. Domain Exceptions and Centralized Handling

- **Prohibition of `HTTPException` in Services:** Raise typed domain exceptions that inherit from a base class with an `Error` suffix (PEP 8 / N818).
- **Translation in Exception Handlers:** Centralize conversion from domain exceptions to HTTP status codes (400, 404, 409, 422) in `main.py` via `@app.exception_handler`:

```python
# app/features/orders/exceptions.py
class OrderDomainError(Exception):
    """Root exception for the orders domain."""

class OrderNotFoundError(OrderDomainError):
    def __init__(self, order_id: int) -> None:
        super().__init__(f"Order {order_id} not found")
        self.order_id = order_id

# main.py
@app.exception_handler(OrderNotFoundError)
async def handle_order_not_found(request: Request, exc: OrderNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc), "code": "ORDER_NOT_FOUND", "order_id": exc.order_id},
    )
```

---

## 4. Application Lifecycle with `lifespan`

Use modern asynchronous context managers for deterministic initialization and teardown of connection pools and external clients, replacing deprecated `@app.on_event` handlers:

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import create_db_engine, dispose_db_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize engines and pools in app.state
    app.state.engine = create_db_engine()
    yield
    # Shutdown: Close open connections and resources
    await dispose_db_engine(app.state.engine)

app = FastAPI(lifespan=lifespan)
```

---

## 5. References and Official Reading

- [FastAPI Tutorial - Bigger Applications / Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [FastAPI Lifespan Events Documentation](https://fastapi.tiangolo.com/advanced/events/)
- [zhanymkanov/fastapi-best-practices (GitHub)](https://github.com/zhanymkanov/fastapi-best-practices)
- [Netflix Dispatch Architecture Pattern](https://github.com/Netflix/dispatch)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/)
