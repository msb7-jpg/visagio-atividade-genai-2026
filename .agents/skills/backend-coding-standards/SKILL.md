---
name: backend-coding-standards
description: Diretrizes e padrões arquiteturais para backend moderno em Python 3.12+ e FastAPI: Clean Architecture, Vertical Slices, Injeção de Dependências (DI), anti-god files, separação de responsabilidades (Routers/Services/Repositories), linters/formatadores (Ruff, Pyright, import-linter), testes e resiliência. Use ao arquitetar, refatorar, implementar APIs, serviços, routers, repositórios, linters ou testes no backend.
---

# Padrões Arquiteturais e Boas Práticas de Backend (Python 3.12+ & FastAPI)

Este documento atua como o **HUB Central de Diretrizes de Backend**, estabelecendo as regras inegociáveis e roteando para guias especializados sob demanda (*Progressive Disclosure*).

---

## 🧭 Mapa de Navegação e Sub-Referências

Consulte a referência temática correspondente para implementações detalhadas:

| O que você está desenvolvendo ou ajustando? | Referência Especializada |
|---|---|
| **Estrutura de pastas, camadas, Routers finos, Services puros, Repositories e Schemas** | 👉 [`references/architecture-and-layers.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/architecture-and-layers.md) |
| **Injeção de Dependências (4 níveis), `Annotated[T, Depends()]`, lifespan e `app.state`** | 👉 [`references/dependency-injection.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/dependency-injection.md) |
| **Refatoração de arquivos grandes (>300 linhas), divisão de domínios e Strategy pattern** | 👉 [`references/domain-and-service-scaling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/domain-and-service-scaling.md) |
| **Sintaxe moderna do Python 3.12+, imutabilidade de variáveis, early returns e walrus (`:=`)** | 👉 [`references/python-idioms-and-quality.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/python-idioms-and-quality.md) |
| **Regras do Ruff (pyproject.toml), Pyright, contratos arquiteturais (`import-linter`) e Docstrings** | 👉 [`references/linters-and-tooling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/linters-and-tooling.md) |
| **Testes assíncronos (`pytest`), fixtures, mocks de serviço e `app.dependency_overrides`** | 👉 [`references/testing.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/testing.md) |

---

## ⚡ Princípios Inegociáveis (Core Rules)

1. **Separação Estrita de Responsabilidades (SRP):**
   - **Routers:** Validação com Pydantic, chamada do serviço e retorno. Zero regras de negócio.
   - **Services:** Pure Python. Proibido importar `fastapi` ou `starlette`.
   - **Repositories:** Donos das queries e isolamento de ORM. O serviço manipula entidades conceituais.
2. **Injeção de Dependências Limpa:**
   - Use aliases `Annotated[T, Depends(factory)]`.
   - Injeção em serviços via `__init__`, nunca variáveis globais.
   - Profundidade máxima de injeção $\le 3$ (`route → service → repo`).
3. **Exceções de Domínio:**
   - Proibido lançar `HTTPException` dentro de serviços. Lance exceções de domínio (`*Error`) e mapeie-as centralizadamente em `@app.exception_handler`.
4. **Respeito aos Limites de Tamanho e Complexidade:**
   - Métodos e funções com **máximo de 30 linhas**.
   - Arquivos de serviço com **máximo de 300 linhas** (acima disso, extraia colaboradores especialistas ou subdomínios).
   - Complexidade ciclomática McCabe $\le 10$.
5. **Imutabilidade e Single Assignment:**
   - Proibido reatribuir a mesma variável com propósitos ou transformações diferentes (ex: mutação contínua de `queryset`). Adote nomes intencionais e imutáveis.
6. **Controle Estrito de Tipagem e Qualidade:**
   - Proibido `dict[str, Any]` em contratos públicos (use Pydantic `BaseModel` ou `TypedDict`).
   - Nomes de variáveis com uma única letra (`k`, `v`, `i`) são proibidos em pipelines.
   - Docstrings no padrão Google-Style em todas as funções e métodos públicos.

---

## 📊 Matriz Resumo / Cheat Sheet

| Sintoma / Cenário | Ação Corretiva | Onde Ver Mais |
|---|---|---|
| Serviço ultrapassou 300 linhas | Extrair colaboradores especialistas por responsabilidade | [`domain-and-service-scaling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/domain-and-service-scaling.md) |
| Método ultrapassou 30 linhas | Decompor em funções atômicas puras | [`domain-and-service-scaling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/domain-and-service-scaling.md) |
| Serviço importando `fastapi` | Mover transporte para o router; manter serviço como Pure Python | [`architecture-and-layers.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/architecture-and-layers.md) |
| Rota com assinatura longa cheia de `Depends` | Criar alias com `Annotated[T, Depends(fn)]` | [`dependency-injection.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/dependency-injection.md) |
| Mockar banco ou serviço em testes | Usar `app.dependency_overrides` no conftest | [`testing.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/testing.md) |
| Acoplamento indevido entre features | Enforçar contrato forbidden/layers no `import-linter` | [`linters-and-tooling.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/linters-and-tooling.md) |
| Reatribuição contínua da mesma variável | Dividir em variáveis intencionais e imutáveis | [`python-idioms-and-quality.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/backend-coding-standards/references/python-idioms-and-quality.md) |
