# Guia Geral de Arquitetura e Blueprint de Novos Projetos

Este documento sintetiza a arquitetura adotada no repositório, seus padrões de engenharia, diretrizes de design e boas práticas. Ele serve como **blueprint reproduzível** para criar novos projetos com a mesma robustez técnica, independentemente do domínio de negócio.

---

## 1. 🏛️ Visão Geral da Arquitetura

O sistema é construído sobre o princípio da **Vertical Slice Architecture** (Fatiamento Vertical) de ponta a ponta, orientada a Casos de Uso e Domínio, substituindo o particionamento horizontal tradicional por tipo de arquivo.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                      │
│  routes/ -> features/[slice]/ (components, hooks, schemas, api, types) │
│  Pure UI (Dumb/Presentational) ◄──► Feature Containers / Hooks (Logic) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / REST (JSON)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI + Async Python)                │
│  app/features/[slice]/                                                 │
│    ├── router.py (Camada HTTP: decoradores, auth, status HTTP)         │
│    ├── router_metadata.py (EndpointDoc imutável para Swagger/OpenAPI)  │
│    ├── schemas.py (Pydantic DTOs + from_model mappers + QueryParams)   │
│    ├── service.py / handlers.py / queries.py (Regras puras de negócio) │
│    └── repository.py (Acesso a dados com SQLAlchemy assíncrono)        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ SQLAlchemy 2.0 Async
                                     ▼
                        [(Banco de Dados Relacional)]
```

---

## 2. ⚙️ Backend: Padrões e Camadas (`FastAPI + SQLAlchemy`)

### 2.1 Separação Estrita de Responsabilidades (HTTP vs. Negócio)

A divisão é pautada pelo acoplamento com o protocolo HTTP:

`[ Requisição HTTP ] ──► [ Router / Dependencies ] ──► [ Queries / Handlers / Services / Repo ]`  
*(Conhece FastAPI / Status Codes)* ────────────────► *(Código Python Puro / Domínio)*

1. **Camada HTTP (`router.py`, `dependencies.py`):**
   - É a **única** camada autorizada a importar `fastapi`, inspecionar cabeçalhos/cookies, ler query params, injetar dependências (`Depends`) e lançar `HTTPException`.
   - Simplificação de injeções repetitivas com `Annotated` e type-alias inline:
     ```python
     EntityRepo = Annotated[EntityRepository, Depends(lambda s=Depends(get_db): EntityRepository(s))]
     ```

2. **Camada de Negócio e Dados (`service.py`, `repository.py`, `queries.py`):**
   - **Código Python puro**: terminantemente proibido importar `fastapi` ou disparar `HTTPException`.
   - Entidades não encontradas retornam `None` ou lançam exceções nativas de domínio (ex: `EntityNotFoundError`). O roteador captura e mapeia para o status code HTTP correspondente (ex: `404 Not Found`).
   - **Divisão por propósito:**
     - `queries.py`: Funções simples de leitura direta via ORM (`SELECT` / `.scalars().all()`).
     - `handlers.py`: Ações atômicas de escrita ou passos únicos (ex: registrar auditoria).
     - `service.py`: Lógica com múltiplos passos e orquestração (ex: hashing, integrações externas, emissão de tokens).
     - `repository.py`: Encapsulamento de consultas agregadas e transações de banco.

### 2.2 Isolamento de Metadados OpenAPI (`EndpointDoc`)

Para eliminar poluição visual de decoradores de rotas, os metadados do Swagger são isolados em `router_metadata.py` usando uma dataclass imutável:

```python
# app/shared/docs.py
from dataclasses import dataclass, field
from typing import Any

@dataclass(frozen=True)
class EndpointDoc:
    response_model: Any
    summary: str
    description: str | None = None
    extra_options: dict[str, Any] = field(default_factory=dict)

    @property
    def to_dict(self) -> dict[str, Any]:
        base = {"response_model": self.response_model, "summary": self.summary}
        if self.description:
            base["description"] = self.description
        return {**base, **self.extra_options}
```

**Uso no Slice:**
```python
# app/features/usuarios/router_metadata.py
ListUsersDoc = EndpointDoc(
    response_model=PaginatedResponse[UserListItemDTO],
    summary="Listagem paginada de usuários",
    description="Filtra usuários ativos com suporte a busca textual."
)

# app/features/usuarios/router.py
@users_router.get("", **ListUsersDoc.to_dict)
async def list_users(filters: Annotated[UserFilterParams, Depends()], repo: UsersRepo):
    return await repo.list_users(filters)
```

### 2.3 Objetos de Parâmetros de Requisição

Parâmetros de query string (mais de 2 ou 3) devem ser agrupados em classes Pydantic anotadas com `Query` e injetados via `Depends()`:

```python
class UserFilterParams(BaseModel):
    page: Annotated[int, Query(ge=1)] = 1
    page_size: Annotated[int, Query(ge=1, le=100)] = 20
    q: Annotated[str | None, Query(default=None)] = None
    status: Annotated[str | None, Query(default=None)] = None
```

### 2.4 DTOs e Mappers Declarativos (`from_model`)

Mapeamentos manuais repetitivos dentro de repositories ou routers poluem o código. DTOs de saída encapsulam sua própria construção via factory classmethod:

```python
class UserDetailDTO(BaseModel):
    id: str
    nome: str
    email: str
    perfis: list[str]

    @classmethod
    def from_model(cls, user: Any) -> "UserDetailDTO":
        return cls(
            id=str(user.id),
            nome=user.nome,
            email=user.email,
            perfis=[p.nome for p in getattr(user, "perfis", [])],
        )
```

---

## 3. 🎨 Frontend: Diretrizes e UI (`React 19 + Tailwind CSS + shadcn/ui`)

### 3.1 Separação Estrita de Responsabilidade em Componentes

1. **Pure UI / Presentational Components (Dumb / View-only):**
   - Recebem dados e callbacks exclusivamente via `props`.
   - Cuidam unicamente de layout, responsividade, Tailwind CSS e microinterações (`framer-motion`).
   - Zero dependência direta de APIs, hooks de navegação ou chamadas de rede.
2. **Feature Containers / Page Controllers (Orquestradores):**
   - Conectam a URL e os hooks da feature aos componentes visuais.
   - Gerenciam `isLoading`, `isError` e repassam dados tratados para as views.
3. **Custom Hooks por Slice (`use[Feature]`):**
   - Centralizam o consumo do TanStack Query (`useQuery`, `useMutation`), sincronização com URL (`useSearchParams`) e controle de formulários.
4. **Schemas & Contracts (`schemas.ts` + `types.ts`):**
   - Contratos Zod para validação em runtime (formulários e APIs) com inferência automática de tipos TypeScript (`z.infer<typeof schema>`).

### 3.2 Boas Práticas de Engenharia (State & Hooks)

- **`useCallback` consciente:** Não use `useCallback` preventivamente. Criar funções inline em JS é muito leve ($O(1)$), enquanto `useCallback` adiciona comparações de dependência a cada render ($O(n)$). Use apenas se:
  1. A função for passada para componentes filhos pesados envolvidos em `React.memo`.
  2. A função for dependência de outro hook (`useEffect`, `useMemo`).
- **TanStack Form (`useSelector` vs `useStore`):** Sempre use `useSelector` para assinar o estado do formulário (`useStore` é considerado depreciado).
- **TanStack Query (Fonte única da verdade):** Nunca aninhe mutações (`useMutation` chamando outro `useMutation`). Se um context/hook (ex: `useAuth`) gerencia uma mutação, consuma a promise diretamente no `onSubmit` do formulário.
- **Rotas com Template Literal Types:** Proibido uso de strings mágicas soltas. Centralize construtores em `src/routes/routes.types.ts`:
  ```typescript
  export type DynamicEntityRoute = `/itens/${string | number}`
  export const routes = {
    list: () => '/itens' as const,
    detail: (id: string | number): DynamicEntityRoute => `/itens/${id}`,
  } as const
  ```
- **Preservação de Estado na URL:** Filtros, ordenação, busca, página e visualizações (`?view=grid|list`, `?page=1`) sincronizados via query string no React Router para garantir compartilhamento de links e histórico do navegador funcional.
- **Adoção de utilitários do `@reactuses/core` 


---

## 4. 🌐 Linguagem Onipresente (Ubiquitous Language)

Para eliminar atrito de tradução mental e incompatibilidades entre backend e frontend:
- **O mesmo nome de campo é mantido em todo o ciclo de vida do dado:**
  - Banco de Dados ➔ Modelos ORM ➔ Schemas Pydantic ➔ JSON da API ➔ Schemas Zod ➔ Campos do Formulário (`form.Field name="x"`).
- Evita-se traduzir identificadores no frontend (ex.: não usar `title` no front se o banco/API expõe `titulo`).

---

## 5. 🚀 Blueprint: Como Iniciar um Novo Projeto do Zero

Siga este passo a passo agnóstico a qualquer domínio para replicar este padrão em uma nova aplicação.

### Passo 1: Inicialização do Monorepo / Repositório

```bash
mkdir novo-projeto && cd novo-projeto
git init

# Frontend (Vite + React + TypeScript)
npm create vite@latest frontend -- --template react-ts

# Backend (Python)
mkdir backend && cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn[standard] sqlalchemy[asyncio] aiosqlite pydantic pydantic-settings alembic pytest httpx
cd ..
```

### Passo 2: Configuração do Design System (Frontend)

```bash
cd frontend
npm install tailwindcss @tailwindcss/vite lucide-react clsx tailwind-merge
npx shadcn@latest init
npm install @tanstack/react-query @tanstack/react-form zod react-router framer-motion
cd ..
```

### Passo 3: Árvore Canônica de Diretórios (Template)

```text
novo-projeto/
├── backend/
│   ├── app/
│   │   ├── core/              # config.py, security.py, logging.py
│   │   ├── db/                # base.py (Base Declarativa), session.py (AsyncSession)
│   │   ├── shared/            # docs.py (EndpointDoc), pagination.py, exceptions.py
│   │   └── features/          # <-- VERTICAL SLICES DO BACKEND
│   │       ├── auth/          # Slice de autenticação / JWT
│   │       └── [nome_modulo]/ # Slice de negócio
│   │           ├── router.py
│   │           ├── router_metadata.py
│   │           ├── schemas.py
│   │           ├── service.py
│   │           └── repository.py
│   ├── alembic/               # Migrações versionadas de schema
│   └── tests/                 # Testes de integração com Pytest e HTTPX
│
└── frontend/
    └── src/
        ├── components/
        │   ├── ui/            # Primitivos headless do shadcn (Button, Dialog, Input...)
        │   ├── layout/        # AppLayout, Navbar, Footer, Sidebar
        │   └── feedback/      # ErrorBoundary, EmptyState, PageLoader
        ├── features/          # <-- VERTICAL SLICES DO FRONTEND
        │   ├── auth/          # Login, contexto de sessão
        │   └── [nome_modulo]/ # Slice de interface de negócio
        │       ├── components/# Pure UI (cards, tabelas, modais)
        │       ├── hooks/     # Custom hooks com TanStack Query
        │       ├── schemas/   # Schemas Zod de validação
        │       ├── api/       # Funções HTTP dedicadas
        │       └── types/     # Tipos TS específicos do domínio
        ├── routes/            # routes.types.ts (Template Literals) + AppRouter.tsx
        └── lib/               # queryClient.ts, axios.ts, utils.ts
```

### Passo 4: Ciclo de Desenvolvimento de uma Nova Feature

Ao implementar um novo caso de uso (ex: `produtos`, `pedidos`, `agendamentos`):

1. **Definir a Linguagem Onipresente:** Alinhe os nomes canônicos das colunas e propriedades.
2. **Backend Slice:**
   - Criar DTOs com validações Pydantic e construtor `from_model` em `schemas.py`.
   - Implementar as consultas no `repository.py` retornando DTOs prontos.
   - Definir os metadados de documentação OpenAPI em `router_metadata.py`.
   - Expor as rotas em `router.py`, injetando o repositório via `Annotated[..., Depends()]`.
3. **Frontend Slice:**
   - Declarar o contrato Zod espelhando os mesmos nomes do backend em `schemas/[modulo].schemas.ts`.
   - Criar os clientes HTTP em `api/[modulo].api.ts`.
   - Criar o hook de dados em `hooks/use[Modulo].ts` com o TanStack Query.
   - Criar os componentes puramente visuais recebendo dados via `props` em `components/`.
   - Criar a view/container responsável por conectar URL, hook e UI.
