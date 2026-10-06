# Referência: Linters, Formatadores e Análise Estática de Backend

Este guia detalha o ecossistema de linters, analisadores estáticos, ferramentas de tipagem e verificação de contratos arquiteturais para o backend moderno com Python 3.12+ e FastAPI gerenciado via `uv`.

---

## 1. Ruff: Motor Unificado de Linting e Formatação

O backend utiliza o [Ruff](https://docs.astral.sh/ruff/) como linter e formatador de altíssima performance escrito em Rust. Toda a configuração vive em `pyproject.toml`.

### 1.1 Configuração Ativa no Repositório

```toml
[tool.ruff]
preview = true
line-length = 120
target-version = "py312"
extend-exclude = ["migrations/versions"]

[tool.ruff.lint]
select = [
    "E",    # pycodestyle Error (estilo padrão)
    "F",    # Pyflakes (erros lógicos, variáveis não usadas)
    "I",    # isort (organização limpa de imports)
    "UP",   # pyupgrade (força sintaxe moderna do Python 3.12+)
    "B",    # flake8-bugbear (previne bugs de lógica e anti-padrões)
    "SIM",  # flake8-simplify (sugere simplificações de código)
    "complex-structure", # mccabe (Complexidade ciclomática <= 10)
    "N",    # pep8-naming (garante padrões estritos de nomenclatura)
    "C4",   # flake8-comprehensions (otimiza list/dict comprehensions)
    "FA",   # flake8-future-annotations (melhora performance de type hinting)
    "ISC",  # flake8-implicit-str-concat (evita concatenações implícitas perigosas)
    "PIE",  # flake8-pie (qualidade e refinamento de código)
    "PT",   # flake8-pytest-style (padroniza testes robustos no pytest)
    "RSE",  # flake8-raise (elimina parênteses redundantes em exceções)
    "RET",  # flake8-return (retornos lógicos limpos e guard clauses)
    "SLF",  # flake8-self (bloqueia acessos indevidos a membros privados)
    "T20",  # flake8-print (proíbe print solto - exige logging estruturado)
    "PERF", # Perflint (regras de performance em loops/estruturas)
    "FURB", # refurb (modernização de código idiomático)
    "RUF",  # Regras nativas do próprio Ruff
    "ASYNC",# flake8-async (previne bugs em corrotinas e geradores assíncronos)
    "S",    # flake8-bandit (análise de vulnerabilidades de segurança - SQLi, secrets)
    "ambiguous-variable-name", # Proíbe variáveis com nomes de uma letra ambíguos
]

ignore = [
    "assert", # Permite usar assert (essencial para testes com pytest)
    "yield-in-context-manager-in-async-generator", # Permite yield em async generators (necessário para streaming SSE)
]

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.flake8-bugbear]
extend-immutable-calls = ["fastapi.Depends", "fastapi.Query", "fastapi.Path"]
```

### 1.2 Regras Explicadas & Boas Práticas

| Grupo / Regra | O que valida | Como o agente deve aplicar |
|---|---|---|
| **`complex-structure` (McCabe $\le 10$)** | Quantidade de ramificações (`if`, `for`, `try`, etc.). | Decompor funções em subfunções puras (ex: `_extract_filters`, `_validate_token`). |
| **`N` (pep8-naming)** | Nomes de classes, funções e exceções. | Exceções **devem** terminar com `*Error` (PEP 8 / N818). Classes em `PascalCase`, variáveis/funções em `snake_case`. |
| **`T20` (flake8-print)** | Presença de `print()` no código. | Usar sempre o logger configurado (`logging.getLogger(__name__)`). Nunca `print()`. |
| **`ASYNC` (flake8-async)** | Bloqueios síncronos em corrotinas, cancelamento incorreto. | Nunca use chamadas I/O blocantes (`requests`, `time.sleep`) dentro de `async def`. Use `asyncio.sleep` e `httpx.AsyncClient`. |
| **`S` (flake8-bandit)** | Vulnerabilidades de segurança (injeção de SQL, credenciais expostas). | Proibido interpolar queries com `f"SELECT ... WHERE id = {user_input}"`. Usar queries parametrizadas. |
| **`UP` (pyupgrade)** | Sintaxe antiga do Python. | Usar `X | Y` em vez de `Union[X, Y]`, `list[str]` em vez de `typing.List[str]`. |
| **`B` (flake8-bugbear)** | Anti-padrões como argumentos default mutáveis (`def fn(x=[])`). | Argumentos imutáveis (`fastapi.Depends` foi configurado como imutável seguro). |
| **`RET` (flake8-return)** | Retornos desnecessários e else redundante após return. | Estimula *Early Returns* e eliminação de blocos `else` dispensáveis. |

### 1.3 Comandos do Dia a Dia com `uv`

```bash
# Executar verificação de linting
uv run ruff check .

# Aplicar correções automáticas seguras
uv run ruff check . --fix

# Formatar o código de acordo com o padrão do projeto
uv run ruff format .
```

---

## 2. Pyright: Análise Estática e Tipagem Estrita

O [Pyright](https://github.com/microsoft/pyright) é o verificador estático de tipos adotado para garantir segurança em tempo de desenvolvimento.

### 2.1 Configuração Ativa no Repositório

```toml
[tool.pyright]
include = ["app"]
typeCheckingMode = "standard"
useLibraryCodeForTypes = true
reportMissingTypeStubs = false
```

### 2.2 Diretrizes de Tipagem para o Agente
1. **Sem `dict[str, Any]` Livre:** Contratos de entrada e saída sempre utilizam Pydantic `BaseModel`. Dicionários estruturados internos usam `TypedDict`.
2. **Type Aliases Modernos (PEP 695):**
   ```python
   type SqlScalar = str | int | float | bool | None
   type QueryResultRow = dict[str, SqlScalar]
   ```
3. **Genéricos e Protocolos:**
   Utilize `typing.Protocol` para desacoplamento de dependências e inversão de controle (substitui herança direta em padrões *Strategy*).
4. **Resolução de Erros de Tipo:**
   Se uma biblioteca externa não fornecer stubs de tipo, crie um cast seguro com `typing.cast` ou defina um protocolo intermediário antes de recorrer a qualquer escape.

### 2.3 Comandos do Dia a Dia com `uv`

```bash
# Executar checagem de tipos estrita
uv run pyright
```

---

## 3. Import-Linter: Governança e Isolamento Arquitetural

O [`import-linter`](https://import-linter.readthedocs.io/en/stable/) permite definir e fiscalizar contratos estruturais de importação no monólito modular, garantindo que as fronteiras arquiteturais não sejam violadas ao longo do tempo.

### 3.1 Use Cases e Contratos Possíveis

O `import-linter` suporta múltiplos tipos de contratos:

1. **`forbidden` (Isolamento de Domínio):**
   - *Caso de Uso:* Um domínio não pode depender diretamente de outro (ex: `orders` não deve importar `billing` ou `payments`).
   - Garante que a comunicação entre fatias verticais seja desacoplada ou mediada por um barramento/serviço compartilhado.
2. **`layers` (Hierarquia Estrita em Camadas):**
   - *Caso de Uso:* Camadas inferiores não podem importar camadas superiores (ex: `db` ou `repositories` não podem importar `routers` ou `services`).
   ```
   router  -->  service  -->  repository  -->  models / db
   ```
3. **`independence` (Módulos Independentes):**
   - *Caso de Uso:* Múltiplos submódulos em um pacote não podem importar nada entre si (ex: cada plugin ou feature isolada).

### 3.2 Como Configurar no Projeto com `uv`

#### Passo 1: Instalação no grupo dev
```bash
uv add --dev import-linter
```

#### Passo 2: Configuração do Arquivo `.importlinter` (na raiz do projeto)

```ini
[importlinter]
root_packages =
    app

# Contrato 1: Routers e Services não conhecem detalhes de infraestrutura direta
[importlinter:contract:layering-contracts]
name = Camadas arquiteturais estritas
type = layers
layers =
    app.features.*.router
    app.features.*.service
    app.features.*.repository
    app.db

# Contrato 2: Serviços nunca importam o framework FastAPI
[importlinter:contract:services-pure-python]
name = Serviços são código puro em Python
type = forbidden
source_modules =
    app.features.*.service
forbidden_modules =
    fastapi
    starlette

# Contrato 3: Isolamento entre Fatias Verticais (Vertical Slices)
[importlinter:contract:feature-isolation]
name = Features não importam repositórios de outras features
type = forbidden
source_modules =
    app.features.chat
forbidden_modules =
    app.features.settings.repository
    app.features.settings.service
```

### 3.3 Execução no CI / Pré-Commit

```bash
# Verificar contratos de importação
uv run lint-imports
```

---

## 4. Documentação Técnica: Padrão Google Docstring

Todas as classes, métodos e funções públicas no backend **devem** seguir a especificação Google-Style Docstring.

### 4.1 Estrutura Canônica
1. **Resumo:** Uma linha concisa terminada em ponto final.
2. **Linha em branco.**
3. **Descrição detalhada:** Explicação do comportamento, restrições e regras de negócio caso necessário.
4. **`Args:`** Nome do parâmetro seguido de dois pontos e a descrição detalhada.
5. **`Returns:`** Descrição clara do dado retornado e sua semântica.
6. **`Raises:`** Lista de exceções de domínio ou sistema lançadas conscientemente.

### 4.2 Exemplo Completo

```python
from app.db.types import QueryResultRow
from app.shared.exceptions import DatabaseQueryError, SecurityViolationError


async def execute_safe_query(
    query: str,
    parameters: dict[str, SqlScalar] | None = None,
    timeout_seconds: float = 30.0,
) -> list[QueryResultRow]:
    """Executa consulta SQL parametrizada em modo somente-leitura.

    Valida a árvore sintática (AST) para bloquear comandos destrutivos
    (INSERT, UPDATE, DELETE, DROP) e limita a volumetria de retorno.

    Args:
        query: Expressão SQL parametrizada a ser executada.
        parameters: Mapeamento de identificadores para escalares seguros.
        timeout_seconds: Tempo limite de execução da consulta em segundos.

    Returns:
        Lista de registros representando as linhas retornadas do banco,
        onde as chaves são os nomes das colunas.

    Raises:
        SecurityViolationError: Se a consulta contiver comandos de mutação.
        DatabaseQueryError: Se a execução falhar no banco de dados.
    """
```

---

## 5. Workflow de Validação e Pré-Commit (Backend)

Antes de concluir qualquer tarefa ou submeter um PR, execute a sequência de validação:

```bash
# 1. Checagem de Estilo, Erros Lógicos e Nomenclatura (Ruff)
uv run ruff check .

# 2. Formatação Automática (Ruff)
uv run ruff format .

# 3. Análise Estática de Tipos (Pyright)
uv run pyright

# 4. Checagem de Contratos Arquiteturais (quando configurado)
uv run lint-imports

# 5. Suíte de Testes Automatizados (Pytest)
uv run pytest
```

---

## 6. Referências e Leituras Oficiais

- [Ruff Rules Documentation](https://docs.astral.sh/ruff/rules/)
- [Astral UV Official Guide](https://docs.astral.sh/uv/)
- [Microsoft Pyright Configuration](https://microsoft.github.io/pyright/#/configuration)
- [Import-Linter Official Documentation](https://import-linter.readthedocs.io/en/stable/)
- [Import-Linter Contract Types Guide](https://import-linter.readthedocs.io/en/stable/contract_types/index.html)
- [Google Python Style Guide - Comments and Docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings)
