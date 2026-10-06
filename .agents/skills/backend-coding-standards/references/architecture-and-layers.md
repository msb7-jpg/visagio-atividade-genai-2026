# Referência: Arquitetura em Camadas, Vertical Slices e Separação de Responsabilidades

Este documento orienta a estruturação de pastas, limites arquiteturais e segregação estrita entre camadas HTTP, regras de negócio e acesso a dados no backend FastAPI (Python 3.12+).

---

## 1. Filosofia de Vertical Slices

Agrupe o código por funcionalidade semântica (Vertical Slices / Features) e não apenas por tipo de arquivo técnico. Cada funcionalidade contém o que precisa para operar:

```text
backend/app/features/
├── orders/
│   ├── router.py       # Camada de transporte HTTP
│   ├── service.py      # Lógica de negócio pura
│   ├── repository.py   # Consultas e persistência no banco
│   ├── schemas.py      # DTOs de entrada e saída (Pydantic V2)
│   └── exceptions.py   # Exceções tipadas do domínio
└── customers/
    ├── router.py
    ├── ...
```

---

## 2. Responsabilidades Estritas por Camada

### 2.1 Routers Finos (Camada de Transporte)
- **Função:** Receber a requisição HTTP, extrair parâmetros, validar payload de entrada via Pydantic, invocar a fachada de serviço injetada e mapear a resposta.
- **Proibição Estrita:** Routers **nunca** contêm lógica de negócio, condicionais complexas de domínio ou queries de banco.
- **Metadados OpenAPI Declarativos (`EndpointDoc` + `**kwargs`):** Em vez de poluir o decorator do router com múltiplos argumentos literais (`summary="...", description="...", response_description="..."`), centralize a documentação em um objeto `EndpointDoc` e desempacote via `**doc.to_dict()`:

```python
# app/shared/docs.py
from dataclasses import asdict, dataclass
from typing import Any

@dataclass(frozen=True, slots=True)
class EndpointDoc:
    """Metadados imutáveis para documentação padronizada do OpenAPI/Swagger."""

    summary: str
    description: str
    response_description: str = "Operação realizada com sucesso"
    responses: dict[int | str, dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Converte metadados em dicionário compatível com kwargs de decorators do FastAPI, omitindo valores None."""
        raw = asdict(self)
        return {key: value for key, value in raw.items() if value is not None}
```

Exemplo de uso limpo no router:

```python
# app/features/orders/router_metadata.py
from app.shared.docs import EndpointDoc

create_order_doc = EndpointDoc(
    summary="Criar novo pedido",
    description="Registra pedido e inicia processo de reserva de estoque.",
    response_description="Pedido criado com sucesso.",
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
    **create_order_doc.to_dict(), # ✅ Desempacota summary, description, responses de forma limpa
)
async def create_order(
    payload: OrderCreateRequest,
    service: OrderSvc,
) -> OrderResponse:
    order = await service.create_order(payload)
    return OrderResponse.model_validate(order)
```

### 2.2 Services Puros (Camada de Domínio / Orquestração)
- **Função:** Conter as regras de negócio, cálculos, transições de estado e orquestração de dependências especializadas.
- **Pure Python:** Classes de serviço **não devem importar** nada de `fastapi` ou `starlette` (ex: `Request`, `Response`, `HTTPException`).
- **Injeção via Construtor:** Recebem repositórios e clientes via `__init__`, nunca por variáveis globais.

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
            raise OrderValidationError("Pedido não pode ser criado sem itens")
        return await self.repository.create(data)
```

### 2.3 Repositories (Camada de Acesso a Dados / Persistência)
- **Função:** Encapsular a execução de queries, filtros, joins e operações no banco de dados (SQLAlchemy, SQLModel, SQLite, etc.).
- **Isolamento de ORM:** Apenas os repositórios conhecem detalhes do ORM e conexões de sessão. O serviço consome métodos de alto nível (`get_by_id`, `create`, `list_active`).

### 2.4 Schemas Pydantic na Fronteira
- Toda comunicação com o exterior (JSON de entrada e saída) utiliza esquemas Pydantic V2 (`BaseModel`).
- **Isolamento de Modelos ORM:** Modelos de banco de dados (`Base` do SQLAlchemy) nunca são retornados diretamente pelos routers da API. Converta explicitamente para DTOs com `model_validate(from_attributes=True)`.

---

## 3. Exceções de Domínio e Tratamento Centralizado

- **Proibido `HTTPException` no Service:** Lance exceções de domínio tipadas que herdam de uma classe base com sufixo `Error` (PEP 8 / N818).
- **Tradução no Handler:** Centralize a conversão de exceções em códigos HTTP (400, 404, 409, 422) no `main.py` via `@app.exception_handler`:

```python
# app/features/orders/exceptions.py
class OrderDomainError(Exception):
    """Exceção raiz do domínio de pedidos."""

class OrderNotFoundError(OrderDomainError):
    def __init__(self, order_id: int) -> None:
        super().__init__(f"Pedido {order_id} não encontrado")
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

## 4. Ciclo de Vida da Aplicação com `lifespan`

Utilize context managers assíncronos modernos para inicialização e cleanup determinístico de pools e conexões, abandonando eventos `@app.on_event` depreciados:

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import create_db_engine, dispose_db_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Cria engines e pools no state
    app.state.engine = create_db_engine()
    yield
    # Shutdown: Encerra conexões abertas
    await dispose_db_engine(app.state.engine)

app = FastAPI(lifespan=lifespan)
```

---

## 5. Referências e Leituras Oficiais

- [FastAPI Tutorial - Bigger Applications / Multiple Files](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [FastAPI Lifespan Events Documentation](https://fastapi.tiangolo.com/advanced/events/)
- [zhanymkanov/fastapi-best-practices (GitHub)](https://github.com/zhanymkanov/fastapi-best-practices)
- [Netflix Dispatch Architecture Pattern](https://github.com/Netflix/dispatch)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/)
