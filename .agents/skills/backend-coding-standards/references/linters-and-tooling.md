# Reference: Linters, Formatters, and Static Analysis for Backend

This guide details the ecosystem of linters, static analyzers, type-checking tools, and architectural contract verification for modern Python 3.12+ and FastAPI backends managed via `uv`.

---

## 1. Ruff: Unified Linting and Formatting Engine

The backend uses [Ruff](https://docs.astral.sh/ruff/) as an ultra-high performance linter and formatter written in Rust. All configuration resides in `pyproject.toml`.

### 1.1 Active Configuration in the Repository

```toml
[tool.ruff]
preview = true
line-length = 120
target-version = "py312"
extend-exclude = ["migrations/versions"]

[tool.ruff.lint]
select = [
    "E",    # pycodestyle Error (standard style)
    "F",    # Pyflakes (logical errors, unused variables)
    "I",    # isort (clean import organization)
    "UP",   # pyupgrade (enforces modern Python 3.12+ syntax)
    "B",    # flake8-bugbear (prevents logical bugs and anti-patterns)
    "SIM",  # flake8-simplify (suggests code simplifications)
    "complex-structure", # mccabe (Cyclomatic complexity <= 10)
    "N",    # pep8-naming (ensures strict naming conventions)
    "C4",   # flake8-comprehensions (optimizes list/dict comprehensions)
    "FA",   # flake8-future-annotations (improves type hinting performance)
    "ISC",  # flake8-implicit-str-concat (avoids hazardous implicit string concats)
    "PIE",  # flake8-pie (code quality and refinement)
    "PT",   # flake8-pytest-style (standardizes robust pytest testing)
    "RSE",  # flake8-raise (eliminates redundant parentheses in raises)
    "RET",  # flake8-return (clean logical returns and guard clauses)
    "SLF",  # flake8-self (blocks private member accesses)
    "T20",  # flake8-print (prohibits stray prints - requires structured logging)
    "PERF", # Perflint (performance rules for loops and structures)
    "FURB", # refurb (idiomatic code modernization)
    "RUF",  # Ruff-native rules
    "ASYNC",# flake8-async (prevents coroutine and async generator bugs)
    "S",    # flake8-bandit (security vulnerability analysis - SQLi, secrets)
    "ambiguous-variable-name", # Prohibits ambiguous single-letter variable names
]

ignore = [
    "assert", # Allows assert statements (essential for pytest)
    "yield-in-context-manager-in-async-generator", # Allows yield in async generators (required for SSE streaming)
]

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.flake8-bugbear]
extend-immutable-calls = ["fastapi.Depends", "fastapi.Query", "fastapi.Path"]
```

### 1.2 Explained Rules & Best Practices

| Group / Rule | What It Validates | How the Agent Must Apply It |
|---|---|---|
| **`complex-structure` (McCabe $\le 10$)** | Branching count (`if`, `for`, `try`, etc.). | Decompose functions into pure sub-functions (e.g., `_extract_filters`, `_validate_token`). |
| **`N` (pep8-naming)** | Class, function, and exception naming. | Exceptions **must** end with `*Error` (PEP 8 / N818). Classes use `PascalCase`, variables/functions use `snake_case`. |
| **`T20` (flake8-print)** | Presence of `print()` in code. | Always use the configured logger (`logging.getLogger(__name__)`). Never use `print()`. |
| **`ASYNC` (flake8-async)** | Synchronous blocking in coroutines, improper cancellation. | Never use blocking I/O calls (`requests`, `time.sleep`) inside `async def`. Use `asyncio.sleep` and `httpx.AsyncClient`. |
| **`S` (flake8-bandit)** | Security vulnerabilities (SQL injection, leaked credentials). | Never interpolate queries using `f"SELECT ... WHERE id = {user_input}"`. Use parameterized queries. |
| **`UP` (pyupgrade)** | Deprecated Python syntax. | Use `X | Y` instead of `Union[X, Y]`, `list[str]` instead of `typing.List[str]`. |
| **`B` (flake8-bugbear)** | Anti-patterns like mutable default arguments (`def fn(x=[])`). | Immutable arguments (`fastapi.Depends` is configured as safely immutable). |
| **`RET` (flake8-return)** | Unnecessary returns and redundant else after return. | Encourages *Early Returns* and eliminating superfluous `else` blocks. |

### 1.3 Day-to-Day Commands with `uv`

```bash
# Run linting checks
uv run ruff check .

# Apply safe automatic fixes
uv run ruff check . --fix

# Format code according to project standards
uv run ruff format .
```

---

## 2. Pyright: Static Analysis and Strict Typing

[Pyright](https://github.com/microsoft/pyright) is the static type checker adopted to guarantee type safety during development.

### 2.1 Active Configuration in the Repository

```toml
[tool.pyright]
include = ["app"]
typeCheckingMode = "standard"
useLibraryCodeForTypes = true
reportMissingTypeStubs = false
```

### 2.2 Typing Guidelines for the Agent
1. **No Bare `dict[str, Any]`:** Inbound and outbound contracts must always use Pydantic `BaseModel`. Internal structured dictionaries use `TypedDict`.
2. **Modern Type Aliases (PEP 695):**
   ```python
   type SqlScalar = str | int | float | bool | None
   type QueryResultRow = dict[str, SqlScalar]
   ```
3. **Generics and Protocols:**
   Use `typing.Protocol` for dependency decoupling and inversion of control (replaces direct inheritance in *Strategy* patterns).
4. **Resolving Type Errors:**
   If a third-party library lacks type stubs, create a safe cast with `typing.cast` or define an intermediary protocol before resorting to any type ignore escape hatch.

### 2.3 Day-to-Day Commands with `uv`

```bash
# Run strict type checks
uv run pyright
```

---

## 3. Import-Linter: Architecture Governance and Boundary Isolation

[`import-linter`](https://import-linter.readthedocs.io/en/stable/) enforces and checks structural import contracts across the modular monolith, ensuring architectural boundaries are not violated over time.

### 3.1 Use Cases and Supported Contracts

`import-linter` supports multiple contract types:

1. **`forbidden` (Domain Isolation):**
   - *Use Case:* One domain cannot directly depend on another (e.g., `orders` must not import `billing` or `payments`).
   - Ensures communication between vertical slices is decoupled or mediated by an event bus / shared service.
2. **`layers` (Strict Layer Hierarchy):**
   - *Use Case:* Lower layers cannot import upper layers (e.g., `db` or `repositories` cannot import `routers` or `services`).
   ```
   router  -->  service  -->  repository  -->  models / db
   ```
3. **`independence` (Independent Modules):**
   - *Use Case:* Multiple submodules in a package cannot import anything from each other (e.g., isolated plugins or features).

### 3.2 Setting Up the Project with `uv`

#### Step 1: Install in the dev dependency group
```bash
uv add --dev import-linter
```

#### Step 2: Configure the `.importlinter` file (in the project root)

```ini
[importlinter]
root_packages =
    app

# Contract 1: Routers and Services do not know direct infrastructure details
[importlinter:contract:layering-contracts]
name = Strict architectural layers
type = layers
layers =
    app.features.*.router
    app.features.*.service
    app.features.*.repository
    app.db

# Contract 2: Services never import the FastAPI framework
[importlinter:contract:services-pure-python]
name = Services are pure Python code
type = forbidden
source_modules =
    app.features.*.service
forbidden_modules =
    fastapi
    starlette

# Contract 3: Isolation between Vertical Slices
[importlinter:contract:feature-isolation]
name = Features do not import repositories from other features
type = forbidden
source_modules =
    app.features.chat
forbidden_modules =
    app.features.settings.repository
    app.features.settings.service
```

### 3.3 CI / Pre-Commit Execution

```bash
# Check import contracts
uv run lint-imports
```

---

## 4. Pylint: Advanced Design Metrics and Nesting Checks

While Ruff performs ultra-fast AST-based linting, **Pylint** acts as a deep design inspector for structural thresholds and nesting limits not covered by basic AST rules.

### 4.1 Anti-Nesting & Refactoring Rules (`pyproject.toml`)
- **`too-many-nested-blocks` (`PLR1702` no Ruff / `R1702` no Pylint):** Enforces a maximum nesting depth (`max-nested-blocks = 3`). Prevents deep indentation pyramids (`if` within `for` within `with` within `try`).
- **`nested-min-max` (`W3301`):** Flags redundant nested `min()`/`max()` calls that obscure mathematical calculations (e.g., `max(0, max(a, b))`).
- **`too-many-lines` (`C0302`):** Imposes an upper ceiling on module length (`max-module-lines = 250`).
- **`disallowed-name` & `invalid-name`:** Strictly bans single-letter variable names (`k`, `v`, `i`, `dist`), requiring descriptive identifiers.

```toml
[tool.pylint.design]
max-args = 6
max-locals = 15
max-statements = 40
max-attributes = 10
max-nested-blocks = 3

[tool.ruff.lint.pylint]
max-nested-blocks = 3
```

### 4.2 Running Pylint with `uv`

```bash
uv run pylint app
```

---

## 5. Technical Documentation: Google Docstring Standard

All public classes, methods, and functions in the backend **must** follow the Google-Style Docstring specification.

### 5.1 Canonical Structure
1. **Summary:** A concise single line ending with a period.
2. **Blank line.**
3. **Detailed description:** Explanation of behavior, constraints, and business rules when needed.
4. **`Args:`** Parameter name followed by a colon and detailed description.
5. **`Returns:`** Clear description of the returned data and its semantics.
6. **`Raises:`** List of domain or system exceptions consciously raised.

### 5.2 Complete Example

```python
from app.db.types import QueryResultRow
from app.shared.exceptions import DatabaseQueryError, SecurityViolationError


async def execute_safe_query(
    query: str,
    parameters: dict[str, SqlScalar] | None = None,
    timeout_seconds: float = 30.0,
) -> list[QueryResultRow]:
    """Execute a parameterized SQL query in read-only mode.

    Validates the abstract syntax tree (AST) to block destructive statements
    (INSERT, UPDATE, DELETE, DROP) and restricts result volume.

    Args:
        query: Parameterized SQL expression to be executed.
        parameters: Mapping of identifiers to safe scalars.
        timeout_seconds: Maximum query execution time in seconds.

    Returns:
        List of records representing rows returned from the database,
        where keys are column names.

    Raises:
        SecurityViolationError: If the query contains mutation statements.
        DatabaseQueryError: If query execution fails in the database.
    """
```

---

## 6. Backend Validation and Pre-Commit Workflow

Before completing any task or opening a PR, run the validation sequence:

```bash
# 1. Style, logical errors, and naming checks (Ruff)
uv run ruff check .

# 2. Automated code formatting (Ruff)
uv run ruff format .

# 3. Static type analysis (Pyright)
uv run pyright

# 4. Architectural contract checks (when configured)
uv run lint-imports

# 5. Automated test suite (Pytest)
uv run pytest
```

---

## 6. References and Official Reading

- [Ruff Rules Documentation](https://docs.astral.sh/ruff/rules/)
- [Astral UV Official Guide](https://docs.astral.sh/uv/)
- [Microsoft Pyright Configuration](https://microsoft.github.io/pyright/#/configuration)
- [Import-Linter Official Documentation](https://import-linter.readthedocs.io/en/stable/)
- [Import-Linter Contract Types Guide](https://import-linter.readthedocs.io/en/stable/contract_types/index.html)
- [Google Python Style Guide - Comments and Docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings)
