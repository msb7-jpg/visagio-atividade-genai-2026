---
name: backend-coding-standards
description: Architectural patterns and guidelines for modern Python 3.12+ and FastAPI backends: Clean Architecture, Vertical Slices, Dependency Injection (DI), anti-god files, separation of concerns (Routers/Services/Repositories), linters/formatters (Ruff, Pyright, import-linter), testing, and resilience. Use when architecting, refactoring, implementing APIs, services, routers, repositories, linters, or backend tests.
---

# Architectural Patterns and Backend Best Practices (Python 3.12+ & FastAPI)

This document serves as the **Central Hub for Backend Guidelines**, establishing non-negotiable rules and routing to specialized guides on demand (*Progressive Disclosure*).

---

## 🧭 Navigation Map and Sub-References

Consult the corresponding thematic reference for detailed implementations:

| What are you developing or updating? | Specialized Reference |
|---|---|
| **Folder structure, layers, thin Routers, pure Services, Repositories, and Schemas** | 👉 [`references/architecture-and-layers.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/architecture-and-layers.md) |
| **Dependency Injection (4 levels), `Annotated[T, Depends()]`, lifespan, and `app.state`** | 👉 [`references/dependency-injection.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/dependency-injection.md) |
| **Refactoring large files (>300 lines), domain splitting, and Strategy pattern** | 👉 [`references/domain-and-service-scaling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/domain-and-service-scaling.md) |
| **Modern Python 3.12+ syntax, variable immutability, early returns, and walrus (`:=`)** | 👉 [`references/python-idioms-and-quality.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/python-idioms-and-quality.md) |
| **Ruff rules (pyproject.toml), Pyright, architectural contracts (`import-linter`), and Docstrings** | 👉 [`references/linters-and-tooling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/linters-and-tooling.md) |
| **Async testing (`pytest`), fixtures, service mocks, and `app.dependency_overrides`** | 👉 [`references/testing.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/testing.md) |

---

## ⚡ Non-Negotiable Principles (Core Rules)

1. **Strict Separation of Concerns (SRP):**
   - **Routers:** Validation with Pydantic, invoking the service, and returning responses. Zero business logic.
   - **Services:** Pure Python. Importing `fastapi` or `starlette` is strictly prohibited.
   - **Repositories:** Owners of database queries and ORM isolation. Services manipulate conceptual entities.
2. **Clean Dependency Injection:**
   - Use `Annotated[T, Depends(factory)]` aliases.
   - Inject dependencies into services via `__init__`, never global variables.
   - Maximum injection depth $\le 3$ (`route → service → repo`).
3. **Domain Exceptions:**
   - Throwing `HTTPException` inside services is prohibited. Raise domain exceptions (`*Error`) and map them centrally via a modular `register_exception_handlers(app)` function exposed by the exceptions module (never register them scattered in `main.py`).
4. **Adherence to Size and Complexity Limits:**
   - Methods and functions have a **maximum of 30 lines**.
   - Service files have a **maximum of 300 lines** (beyond this, extract specialist collaborators or subdomains).
   - McCabe cyclomatic complexity $\le 10$.
5. **Immutability, Single Assignment, and Clean Expressions:**
   - Reassigning the same variable for different purposes or transformations is prohibited (e.g., continuous mutation of `queryset`). Adopt intentional and immutable names.
   - Deeply nested expressions and mathematical calculations (e.g., `round(max(0, min(1, 1 - (dist / 2))), 3)`) are prohibited. Decompose into descriptive, immutable intermediate variables.
6. **Strict Typing and Quality Control:**
   - `dict[str, Any]` is prohibited in public contracts (use Pydantic `BaseModel` or `TypedDict`).
   - Single-letter variable names (`k`, `v`, `i`) are prohibited in pipelines.
   - Google-style docstrings on all public functions and methods.

---

## 📊 Summary Matrix / Cheat Sheet

| Symptom / Scenario | Corrective Action | Where to Read More |
|---|---|---|
| Service exceeded 300 lines | Extract specialist collaborators by responsibility | [`domain-and-service-scaling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/domain-and-service-scaling.md) |
| Method exceeded 30 lines | Decompose into atomic pure functions | [`domain-and-service-scaling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/domain-and-service-scaling.md) |
| Service importing `fastapi` | Move transport concerns to router; keep service as Pure Python | [`architecture-and-layers.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/architecture-and-layers.md) |
| Route with long signature packed with `Depends` | Create alias with `Annotated[T, Depends(fn)]` | [`dependency-injection.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/dependency-injection.md) |
| Mocking database or service in tests | Use `app.dependency_overrides` in conftest | [`testing.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/testing.md) |
| Improper coupling across features | Enforce forbidden/layers contracts in `import-linter` | [`linters-and-tooling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/linters-and-tooling.md) |
| Continual reassignment of the same variable | Split into intentional, immutable variables | [`python-idioms-and-quality.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/python-idioms-and-quality.md) |
| Dense nested calls or obscure math calculations | Decompose into descriptive, immutable intermediate variables | [`python-idioms-and-quality.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/python-idioms-and-quality.md) |
