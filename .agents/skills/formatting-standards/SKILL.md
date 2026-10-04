---
name: formatting-standards
description: Diretrizes agnósticas de formatação, documentação (TSDoc/Google Docstring), tipagem estrita e convenções para TypeScript/React 19 e Python 3.12+ (FastAPI).
---

# Diretrizes e Padrões de Engenharia de Software

Este guia estabelece os padrões agnósticos de qualidade de código, documentação técnica, tipagem estrita e ferramentas aplicados em projetos modernos fullstack com **TypeScript (React 19)** e **Python 3.12+ (FastAPI)**.

---

## 1. Ferramental e Ecossistema (Toolchain)

Adotamos ferramentas de alta performance, determinísticas e focadas em *feedback loop* rápido:

### 1.1. Frontend
- **Gerenciador de Pacotes:** `bun` (instalação ágil e execução de scripts ultrarrápida).
- **Bundler & Dev Server:** `vite` (HMR instantâneo e compilação nativa ESM).
- **Linter & Formatação:** `eslint` (Flat config `eslint.config.js`):
  - `@stylistic/eslint-plugin`: Formatação consistente (espaçamento, aspas simples, sem ponto e vírgula, indentação de 2 espaços) sem sobrecarga ou conflitos do Prettier.
  - `eslint-plugin-jsdoc` e `eslint-plugin-tsdoc`: Validação estrita de sintaxe de documentação, exigência de `@param` e `@returns` com descrição sem redundância de tipos.
  - `@shadcn/lint`: Governança de design system, impedindo estilizações arbitrárias fora dos tokens.
  - `eslint-plugin-react-compiler` e `eslint-plugin-react-hooks`: Otimização automática e regras de hooks para o compilador do React 19.
- **Testes:** `vitest` com `@testing-library/react` e `@testing-library/jest-dom` rodando em ambiente `jsdom`.
- **Estilização:** Tailwind CSS combinado com `clsx` e `tailwind-merge` (`cn(...)`).

### 1.2. Backend
- **Gerenciador de Pacotes e Python:** `uv` (gerenciamento determinístico de dependências via `uv.lock`, criação instantânea de virtualenvs e execução com `uv run`).
- **Framework Web:** `fastapi` com validação de schemas baseada no `pydantic` (v2).
- **Linter & Formatação:** `ruff` (motor Rust executando formatação e linter unificados):
  - `E`, `F`, `I` (pycodestyle, pyflakes, isort organizado).
  - `UP` (pyupgrade para sintaxe moderna do Python 3.12+).
  - `B` e `SIM` (flake8-bugbear e flake8-simplify para prevenção de bugs e simplificações lógicas).
  - `complex-structure` (McCabe com complexidade ciclomática estritamente limitada a $\le 10$).
  - `N` (pep8-naming para convenções de nomes e sufixos de exceções).
  - `ASYNC` (flake8-async para segurança de corrotinas e geradores assíncronos).
  - `S` (flake8-bandit para detecção de vulnerabilidades de segurança).
  - `PT` (flake8-pytest-style para testes padronizados).
  - `PERF` e `FURB` (otimizações de desempenho e refatoração idiomática).
- **Testes:** `pytest` com `pytest-asyncio` e `httpx.AsyncClient`.

---

## 2. Padrões de Frontend (TypeScript & React 19)

### 2.1. Regras Fundamentais do React 19
1. **Sem `React.FC` ou `React.FunctionComponent`:** Declare componentes como funções convencionais tipadas com sua interface de props explícita:
   ```typescript
   export function MyComponent({ title, active = false }: MyComponentProps) { ... }
   ```
2. **Sem `forwardRef`:** O React 19 aceita `ref` como uma prop nativa de primeiro nível em componentes de função.
3. **Sem `<Context.Provider>`:** Renderize o contexto diretamente como `<MyContext value={...}>`.
4. **Anti-Bypass de Design System:** Elementos HTML puros como `<button>`, `<input>`, `<select>` e `<textarea>` são proibidos fora do diretório de primitivas de UI (`src/components/ui/`). Utilize sempre os componentes base ou componha através deles.

### 2.2. Eliminação de Strings Mágicas: `as const` e Union Types
Em vez de utilizar TypeScript `enum`s numéricos ou comparar contra strings literais soltas, utilize **objetos congelados com `as const`** e extraia o tipo união derivado.

```typescript
// ✅ CORRETO: Autocomplete, immutabilidade e tipagem nominal
export const SSE_EVENT = {
  SESSION: 'session',
  DONE: 'done',
  TITLE: 'title',
  ERROR: 'error',
  STEP_END: 'step_end'
} as const

export type SseEventType = (typeof SSE_EVENT)[keyof typeof SSE_EVENT]

// Uso:
if (event === SSE_EVENT.SESSION) {
  // Garantia estática de que 'session' nunca sofrerá typo
}
```

### 2.3. Eliminação de `any`
- É expressamente proibido o uso de `any` ou `Record<string, any>`.
- Use `unknown` com *type guards* para dados dinâmicos de rede ou interfaces genéricas parametrizadas (`T`).
- Para dicionários dinâmicos com tipos primitivos seguros:
  ```typescript
  export type PrimitiveRecord = Record<string, string | number | boolean | null>
  ```

### 2.4. Convenções de Documentação (TSDoc & JSDoc)

#### A. Componentes React
- Toda interface de props deve possuir comentários descritivos em suas propriedades.
- Props com valores padrão devem conter a tag `@defaultValue`.
- A função do componente deve possuir JSDoc resumindo seu propósito e acessibilidade.

```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** O texto ou elementos que serão renderizados dentro do botão. */
  children: React.ReactNode
  /** 
   * Determina o estilo visual do botão de acordo com a prioridade da ação.
   * @defaultValue `'primary'`
   */
  variant?: 'primary' | 'secondary' | 'destructive'
  /** Se `true`, desativa a interação e aplica opacidade visual. */
  disabled?: boolean
}

/**
 * Botão customizado do design system encapsulando estilos e acessibilidade.
 *
 * @param props - Propriedades de configuração visual e eventos do botão.
 * @returns Elemento JSX do botão estilizado.
 */
export function Button({ children, variant = 'primary', disabled = false, ...props }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
```

#### B. Custom Hooks
- Separe as opções de entrada em `Use[Nome]Options` e o resultado em `Use[Nome]Result`.
- Documente cada campo das interfaces.
- O hook deve conter `@param` e `@returns`.

```typescript
export interface UseToggleOptions {
  /** O estado booleano que iniciará por padrão. */
  initialValue?: boolean
}

export interface UseToggleResult {
  /** O estado booleano atual. */
  value: boolean
  /** Função memorizada para inverter o estado booleano atual. */
  toggle: () => void
}

/**
 * Gerencia um estado booleano simples de liga/desliga.
 *
 * @param options - Objeto de configuração inicial do hook.
 * @returns Um objeto contendo o estado atual e a função de inversão.
 */
export function useToggle({ initialValue = false }: UseToggleOptions = {}): UseToggleResult {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue((prev) => !prev), [])

  return { value, toggle }
}
```

#### C. Funções Utilitárias e Serviços
- Resumo conciso de uma linha.
- Linha vazia separando a descrição dos metadados.
- Tags `@param <nome> - <descrição>` e `@returns <descrição>`.

```typescript
/**
 * Concatena e resolve conflitos de classes CSS utilitárias do Tailwind.
 *
 * @param inputs - Lista de classes CSS, condições ou expressões.
 * @returns String consolidada com as classes sanitizadas e sem duplicidade.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

---

## 3. Padrões de Backend (Python 3.12+ & FastAPI)

### 3.1. Eliminação de Strings Mágicas: `enum.StrEnum` Nativo
No Python 3.12+, utilize `enum.StrEnum` para constantes canônicas de domínio.
- Herda de `str`: `LLMProvider.GROQ == "groq"` é `True`.
- Serializa diretamente para JSON sem conversores customizados.
- Previne erros de digitação em tempo de desenvolvimento e análise estática.

```python
from enum import StrEnum


class LLMProvider(StrEnum):
    """Provedores de inferência de LLM suportados pelo serviço."""

    GROQ = "groq"
    LOCAL = "local"
    OPENROUTER = "openrouter"
    GOOGLE = "google"
```

### 3.2. Eliminação de `dict[str, Any]` em Favor de Tipos Ricos
- **Modelos de Entrada/Saída da API (DTOs):** Sempre Pydantic `BaseModel`.
- **Estados Internos ou Dicionários Estruturados:** `TypedDict` (com `total=False` quando os campos forem parciais).
- **Mapeamentos de Dados Relacionais/SQL:** Tipo escalar semântico:
  ```python
  type SqlScalar = str | int | float | bool | None
  type QueryResultRow = dict[str, SqlScalar]
  ```

Exemplo prático:
```python
# ❌ EVITAR
def get_user_messages(thread_id: str) -> list[dict[str, Any]]: ...

# ✅ CORRETO
from pydantic import BaseModel, Field


class ThreadMessageDTO(BaseModel):
    """Representação canônica de uma mensagem na thread de conversa."""

    id: str = Field(..., description="Identificador único da mensagem")
    role: Literal["user", "assistant"] = Field(..., description="Papel do autor da mensagem")
    content: str = Field(..., description="Conteúdo textual em markdown")
    generated_sql: str | None = Field(default=None, description="Consulta SQL gerada caso aplicável")


def get_user_messages(thread_id: str) -> list[ThreadMessageDTO]: ...
```

### 3.3. Padrão Google-Style para Docstrings
Adote o formato Google para documentar classes, métodos e funções:
1. Resumo em uma linha terminado em ponto final.
2. Descrição detalhada do comportamento quando necessário.
3. Seção `Args:` com o nome do argumento e descrição.
4. Seção `Returns:` com a descrição do retorno.
5. Seção `Raises:` explicitando as exceções de domínio ou de sistema disparadas.

```python
def execute_sql_query(
    query: str,
    timeout_seconds: float = 30.0,
) -> list[QueryResultRow]:
    """
    Executa uma consulta SQL em modo somente-leitura no banco de dados analítico.

    Aplica filtros de segurança AST previamente para impedir comandos de mutação
    (INSERT, UPDATE, DELETE, DROP) e limita a volumetria de retorno.

    Args:
        query: Código SQL a ser executado.
        timeout_seconds: Limite de tempo de execução da consulta em segundos.

    Returns:
        Lista de dicionários representando as linhas retornadas, onde as chaves
        são os nomes das colunas e os valores são tipos escalares suportados.

    Raises:
        SqlSyntaxError: Se a consulta possuir erros gramaticais de SQL.
        SecurityViolationError: Se a consulta tentar acessar tabelas ou comandos bloqueados.
        DatabaseConnectionError: Se a conexão com o banco SQLite falhar.
    """
```

### 3.4. Hierarquia e Nomenclatura de Exceções
- Exceções personalizadas **devem** seguir a regra PEP 8 / Ruff N818: terminar com o sufixo `Error` (e **não** `Exception`).
- Crie uma exceção raiz abstrata de domínio contendo mensagem e código amigável:

```python
class DomainError(Exception):
    """Exceção base para todas as falhas de domínio da aplicação."""

    def __init__(self, message: str, code: str = "DOMAIN_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class ProviderUnavailableError(DomainError):
    """Disparada quando o provedor de IA configurado está inacessível."""

    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message, code="PROVIDER_UNAVAILABLE")
        self.status_code = status_code
```

### 3.5. Complexidade Ciclomática e Módulos `__init__.py`
1. **Complexidade $\le 10$:** Nenhuma função deve ultrapassar complexidade ciclomática 10. Se uma função tiver muitas bifurcações (`if/elif/for/try`), decomponha a lógica em subfunções puras e reutilizáveis (ex: `_extract_columns`, `_map_exception`).
2. **Módulos `__init__.py` Puros:** O arquivo `__init__.py` de um pacote deve ser reservado para documentação do pacote, importações relativas e definição ordenada de `__all__`. Lógicas de fábricas, instâncias globais ou funções complexas devem viver em submódulos dedicados (ex: `factory.py`, `service.py`).

---

## 4. Checklist Rápido de Qualidade (Pré-Commit)

Antes de finalizar qualquer tarefa ou enviar alterações:

### No Frontend:
- [ ] Rodar `bun run lint` (0 erros e 0 warnings).
- [ ] Rodar `vitest run` ou `bun run test` (todos os testes passando).
- [ ] Nenhum `<button>`, `<input>`, etc. fora de `components/ui`.
- [ ] Todo hook possui `Use...Options`, `Use...Result` e JSDoc `@param` / `@returns`.
- [ ] Toda prop de componente exportado está comentada.
- [ ] Nenhuma string mágica comparada solta (usar `as const`).

### No Backend:
- [ ] Rodar `uv run ruff check .` (0 erros).
- [ ] Rodar `uv run pytest` (todos os testes passando).
- [ ] Nenhuma função com complexidade McCabe $> 10$.
- [ ] Todas as funções públicas contêm docstring Google-style com `Args:`, `Returns:` e `Raises:`.
- [ ] Nenhum `dict[str, Any]` em contratos ou nós principais (usar `BaseModel` ou `TypedDict`).
- [ ] Exceções nomeadas com sufixo `*Error`.
- [ ] Constantes centralizadas com `StrEnum`.
