# Referência: Padrões de Injeção de Dependências (DI) em FastAPI

Este guia detalha a hierarquia de injeção de dependências em 4 níveis adotada para projetos FastAPI de nível de produção.

---

## 1. A Hierarquia Canônica de 4 Níveis

```python
# core/dependencies.py
from typing import Annotated
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

# --------------------------------------------------------------------------
# Nível 1: Singletons de Infraestrutura
# Construídos uma única vez no ciclo `lifespan` e armazenados no `app.state`.
# Exemplos: DB Engine, Redis Pool, clientes HTTP persistentes (httpx.AsyncClient).
# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# Nível 2: Dependências por Requisição (Per-Request)
# Puxam recursos do app.state com yield determinístico para cleanup.
# --------------------------------------------------------------------------
async def get_db(request: Request) -> AsyncSession:
    async with request.app.state.db_session_factory() as session:
        yield session

DBSession = Annotated[AsyncSession, Depends(get_db)]

# --------------------------------------------------------------------------
# Nível 3: Service Factories
# Compõem a infraestrutura e os repositórios em serviços de domínio puros.
# --------------------------------------------------------------------------
async def get_order_service(db: DBSession) -> OrderService:
    return OrderService(repository=OrderRepository(db))

OrderSvc = Annotated[OrderService, Depends(get_order_service)]

# --------------------------------------------------------------------------
# Nível 4: Dependências Transversais Baseadas em Classe
# Rate limiting, auditoria, autenticação de token, feature flags.
# --------------------------------------------------------------------------
class RateLimiter:
    def __init__(self, requests: int, window: int) -> None:
        self.requests = requests
        self.window = window

    async def __call__(self, request: Request) -> None:
        # Lógica de verificação...
        pass

def get_rate_limiter() -> RateLimiter:
    return RateLimiter(requests=100, window=60)

RateLimited = Annotated[None, Depends(get_rate_limiter)]
```

---

## 2. Regras Essenciais de Design de DI

| Regra | Por quê? |
|---|---|
| **Usar `Annotated[T, Depends(fn)]`** | Mantém a assinatura das funções de rotas limpa, legível e reútilizável sem duplicação de `Depends`. |
| **`yield` para Recursos com Fechamento** | Sessões de banco de dados, locks distribuídos ou streams que exigem garantia de `finally` de limpeza. |
| **Injeção via `__init__`, Jamais Globais** | Permite instanciar serviços com mocks em testes unitários sem precisar do framework FastAPI. |
| **Profundidade de Injeção $\le 3$** | A cadeia máxima permitida em uma rota é `route → service → repo`. Cadeias mais profundas devem ser aplanadas. |
| **`app.dependency_overrides` em Testes** | Troca qualquer dependência por implementações em memória sem alterar o código produtivo. |

---

## 3. Uso em Rotas

Ao usar type aliases com `Annotated`, a assinatura da rota fica concisa e intuitiva:

```python
# features/orders/router.py
from fastapi import APIRouter
from core.dependencies import OrderSvc, RateLimited
from features.orders.schemas import OrderCreateRequest, OrderResponse

router = APIRouter()

@router.post(
    "/orders",
    response_model=OrderResponse,
    dependencies=[RateLimited], # Dependência transversal executada antes da rota
)
async def create_order(
    payload: OrderCreateRequest,
    service: OrderSvc, # Serviço de domínio pronto com repositório e sessão injetados
) -> OrderResponse:
    return await service.create_order(payload)
```

---

## 4. Substituição em Testes (Dependency Overrides)

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

## 5. Referências e Leituras Oficiais

- [FastAPI Dependency Injection Tutorial](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [FastAPI Dependencies with yield (Cleanup)](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/)
- [Testing Dependencies with Overrides](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [PEP 593 – Flexible function and variable annotations (Annotated)](https://peps.python.org/pep-0593/)
