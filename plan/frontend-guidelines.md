# Frontend Clean Code Guidelines & Linting Standards (React 19 + TypeScript)

Este documento estabelece as diretrizes canônicas de qualidade de código, boas práticas para JSX/TypeScript e a configuração de linters correspondente para manter o código da interface limpo, legível, performático e livre de armadilhas clássicas do React.

---

## 1. Regras de Ouro: Boas Práticas vs. Más Práticas

### 1.1 Early Return vs. Nested If/Else (Guard Clauses)

Priorize cláusulas de guarda (`early returns`) para tratar estados de carregamento, erros ou ausência de dados antes de renderizar o conteúdo principal.

```tsx
// ✅ GOOD — guard clause, fluxo linear e limpo
function Dashboard({ user, isLoading }: DashboardProps) {
  if (isLoading) return <Spinner />;
  if (!user) return <LoginPrompt />;
  return <MainContent user={user} />;
}

// ❌ BAD — profundamente aninhado, difícil de ler e manter
function Dashboard({ user, isLoading }: DashboardProps) {
  return (
    <div>
      {isLoading ? (
        <Spinner />
      ) : user ? (
        <MainContent user={user} />
      ) : (
        <LoginPrompt />
      )}
    </div>
  );
}
```

---

### 1.2 `&&` com Expressão Booleana vs. `&&` com Número (Falsy `0` Trap)

No React, expressões com valores numéricos (como `0`) avaliadas com `&&` vazam o número `0` diretamente na tela em vez de não renderizar nada.

```tsx
// ✅ GOOD — condição booleana explícita
function Badge({ count }: { count: number }) {
  return <>{count > 0 && <span>{count} novas mensagens</span>}</>;
}

// ❌ BAD — quando count for 0, renderiza o texto literal "0" na tela
function Badge({ count }: { count: number }) {
  return <>{count && <span>{count} novas mensagens</span>}</>;
}
```

---

### 1.3 Ternário para Duas Alternativas vs. Ternários Aninhados

Use ternário estritamente para alternar entre duas opções mutuamente exclusivas e simples. Nunca aninhe ternários no JSX.

```tsx
// ✅ GOOD — duas alternativas claras e diretas
{isLoggedIn ? <LogoutButton /> : <LoginButton />}

// ❌ BAD — ternários aninhados tornam o JSX ilegível
{a ? (b ? <X /> : <Y />) : (c ? <Z /> : <W />)}
```

---

### 1.4 Extração para Variável vs. Lógica Complexa Inline

Se uma decisão condicional envolver mais de duas ramificações ou lógica de apresentação extensa, extraia o resultado para uma variável antes do `return` ou crie um subcomponente focado.

```tsx
// ✅ GOOD — lógica extraída, JSX permanece declarativo e limpo
function Profile({ user, role }: ProfileProps) {
  let content: React.ReactNode;
  
  if (role === "admin") {
    content = <AdminPanel />;
  } else if (role === "editor") {
    content = <EditorPanel />;
  } else {
    content = <ViewerPanel />;
  }

  return <div className="p-4">{content}</div>;
}

// ❌ BAD — lógica densa empilhada dentro do template JSX
function Profile({ user, role }: ProfileProps) {
  return (
    <div className="p-4">
      {role === "admin" ? <AdminPanel /> : role === "editor" ? <EditorPanel /> : <ViewerPanel />}
    </div>
  );
}
```

---

### 1.5 Lookup Mapping (Tabela de Estados) vs. Switch no JSX

Para componentes orientados a múltiplos estados discretos (ex: `idle`, `loading`, `error`, `success`), utilize um dicionário/tabela de mapeamento (`Record<State, React.ReactNode>`).

```tsx
// ✅ GOOD — tabela de lookup, altamente escalável e extensível
function PageStateView({ status }: { status: "idle" | "loading" | "error" | "success" }) {
  const views: Record<string, React.ReactNode> = {
    idle: <ReadyState />,
    loading: <Spinner />,
    error: <ErrorBanner />,
    success: <ResultsView />,
  };

  return views[status] ?? <UnknownState />;
}

// ❌ BAD — switch não funciona diretamente dentro do JSX 
// (exige IIFE feia e verbosa: {(() => { switch(...) ... })()})
```

---

### 1.6 Regras dos Hooks (Conditional Hooks)

Hooks do React (`useState`, `useEffect`, etc.) **nunca** devem ser executados após um retorno antecipado (`early return`) ou dentro de condicionais/laços.

```tsx
// ✅ GOOD — todos os hooks declarados no topo, antes de qualquer early return
function Component({ visible }: { visible: boolean }) {
  const [count, setCount] = useState(0);

  if (!visible) return null;
  return <span>{count}</span>;
}

// ❌ BAD — hook executado condicionalmente (quebra a ordem do Fiber Tree do React)
function Component({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const [count, setCount] = useState(0); // 💥 Violação das Rules of Hooks
  return <span>{count}</span>;
}
```

---

## 2. Guia de Referência Rápida (Quick Reference)

| Padrão | Quando Usar | Risco Mitigado |
| :--- | :--- | :--- |
| **Early return** | Cláusulas de guarda (loading, auth, erro, vazio) | Reduz aninhamento e carga cognitiva |
| **Ternário `? :`** | Apenas duas alternativas curtas e diretas | Clareza de intenção binária |
| **Operador `&&`** | Exibir/ocultar um único elemento condicional | **Exige booleano estrito** (evita vazar `0` ou `NaN`) |
| **Lookup mapping** | 3 ou mais estados discretos | Elimina ternários em cascata e IIFEs |
| **Extração de variável** | Conteúdo com lógica de decisão multi-linhas | Mantém o JSX estritamente declarativo |

> **Regra de bolso:** Mantenha os fluxos condicionais *planos* (flat), use `&&` **apenas** com expressões booleanas explícitas (`count > 0 &&`, `items.length > 0 &&`, `Boolean(x) &&`), e **jamais** aninhe ternários.

---

## 3. Mapeamento de Regras Automatizadas de Lint (ESLint Flat Config)

Para garantir que a equipe e agentes de IA sigam as diretrizes de design system, boas práticas de React 19 e padrões limpos de tipagem, as regras estão centralizadas em `frontend/design-system.lint.json` e `frontend/eslint.config.js`:

| Categoria | Regra ESLint / Plugin | Nível | O que faz / Proteção Garantida |
| :--- | :--- | :--- | :--- |
| **Design System & Estilização** | `shadcn/no-restyle`<br>`shadcn/no-raw-colors`<br>`shadcn/no-arbitrary-values`<br>`shadcn/no-inline-styles` | `error` | Bloqueia re-estilização via `className` em primitivas (impedindo variantes ad-hoc como `chat-variant`), proíbe cores Tailwind fora dos tokens semânticos, veda colchetes arbitrários e `style={{ ... }}`. |
| **Anti-Bypass de Design System** | `react/forbid-elements` | `error` | **Proíbe o agente de burlar o design system** com tags HTML nativas (`<button>`, `<input>`, `<select>`, `<textarea>`) fora de `src/components/ui/**`. Obriga o uso de `<Button>`, `<Input>`, etc. |
| **Anti-React < 19 (Modern React)** | `@typescript-eslint/no-restricted-types`<br>`no-restricted-syntax`<br>`react-compiler/react-compiler`<br>`react/no-deprecated` | `error` | **Bane `React.FC`**, **bane `forwardRef`** (no React 19 `ref` é prop nativa), **bane `<Context.Provider>`** (usa `<Context value={...}>`), ativa o React Compiler e proíbe APIs legadas (`string refs`, `findDOMNode`). |
| **Clean Code & Booleans** | `react/jsx-no-leaked-render`<br>`no-nested-ternary`<br>`react-hooks/rules-of-hooks`<br>`react-hooks/exhaustive-deps` | `error` / `warn` | Previne vazamento de `0` no JSX (`count > 0 &&`), elimina ternários aninhados e enforça regras de hooks. |
| **Naming Conventions** | `@typescript-eslint/naming-convention` | `error` | Enforça que variáveis comuns usem `camelCase`/`snake_case`, constantes usem `UPPER_CASE`, componentes/funções permitam `PascalCase` e tipos/interfaces sejam estritamente `PascalCase`. |

### Configuração de Guardrails Implementada (`frontend/eslint.config.js`)

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactCompiler from 'eslint-plugin-react-compiler'
import shadcnPlugin from '@shadcn/lint'
import { defineConfig, globalIgnores } from 'eslint/config'
import designSystemPolicy from './design-system.lint.json' with { type: 'json' }

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: '19.0' },
      shadcn: {
        ui: '@/components/ui',
        mergeFunctions: ['cn'],
        note: 'See ui/DESIGN.md and .agents/skills/shadcn/SKILL.md. Do not invent domain-specific variants or use raw colors.',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-compiler': reactCompiler,
      shadcn: shadcnPlugin.default || shadcnPlugin,
    },
    rules: {
      ...designSystemPolicy.rules,
      'react/forbid-elements': ['error', { forbid: [...] }],
      'no-restricted-syntax': ['error', /* ban forwardRef & Context.Provider */],
      '@typescript-eslint/no-restricted-types': ['error', /* ban React.FC */],
      'react-compiler/react-compiler': 'error',
      'no-nested-ternary': 'error',
      'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary', 'coerce'] }],
      '@typescript-eslint/naming-convention': [...],
    },
  },
  ...designSystemPolicy.overrides,
  {
    files: ['src/components/ui/**', 'src/components/chat/**'],
    rules: {
      'react/forbid-elements': 'off',
      'shadcn/no-restyle': 'off',
    },
  },
])
```


# Engineering Guidelines & Best Practices

Lean, scannable, and developer-friendly rules for React, TanStack Query, and TanStack Form.

---

## 1. 📖 Using `useCallback` Effectively

The `useCallback` hook is one of the most misunderstood features in React. It is frequently applied defensively under the assumption that it "makes code faster." In reality, it adds performance overhead and often fails silently when paired with dynamic hooks.

### 🚫 The Golden Rule
> **Do not use `useCallback` unless you can prove that breaking referential stability causes a measurable performance issue or broken application logic.**
>
> Creating an inline function in JavaScript is extremely cheap ($O(1)$). Wrapping a function in `useCallback` forces React to create the function anyway, instantiate an array, and perform shallow dependency comparisons on every single render ($O(n)$).

### ❌ When NOT to use `useCallback`

1. **On Native HTML Elements**  
   Native DOM components (like `<button>`, `<input>`, `<div>`) do not care about referential stability. They will always re-render when their parent re-renders.
   ```tsx
   // 🚫 BAD: Total waste of performance tracking
   const handleClick = useCallback(() => {
     doSomething()
   }, [])
   return <button onClick={handleClick}>Submit</button>
   ```

2. **Wrapping Functions with Frequently Changing Dependencies**  
   If a dependency changes on almost every render, `useCallback` will constantly re-run and regenerate the function reference anyway.
   ```tsx
   // 🚫 BAD: Fails silently because `mutation` changes references constantly
   const logout = useCallback(() => {
     logoutMutation.mutate()
   }, [logoutMutation]) // `logoutMutation` changes on almost every render cycle
   ```

3. **Simple Handlers Passed to Unmemoized Components**  
   Passing functions down to components that are not wrapped in `React.memo` gains zero performance benefit.

---

### ✅ When `useCallback` IS Required

You only need referential stability in two specific scenarios:

1. **Passing Callbacks to Child Components Wrapped in `React.memo`**  
   If a heavy child component is explicitly optimized with `React.memo`, passing a fresh function reference on every render breaks that memoization.
   ```tsx
   // ✅ GOOD: Keeps <HeavyComponent /> from re-rendering unnecessarily
   const handleSelect = useCallback((id: string) => {
     setSelectedId(id)
   }, [])
   return <HeavyComponent onSelect={handleSelect} />
   ```

2. **The Function is Used as a Dependency in Another Hook**  
   If your function is included in the dependency array of a `useEffect`, `useMemo`, or a custom hook, it must be stable to prevent infinite loops or accidental triggers.
   ```tsx
   // ✅ GOOD: Prevents the useEffect from executing on every single render
   const fetchData = useCallback(() => {
     api.get(`/data/${id}`)
   }, [id])

   useEffect(() => {
     fetchData()
   }, [fetchData])
   ```

---

### 💡 Alternative Patterns (How to Avoid `useCallback`)

- **A. Extract to Stable References Outside the Component**  
  If a function doesn't depend on component state or props, move it completely outside the component. It will be instantiated exactly once for the lifecycle of the application.
  ```tsx
  // ✅ BEST: No hooks needed, perfectly stable reference
  const formatData = (raw: string) => raw.trim().toLowerCase()
  export function MyComponent() {
    return <input onChange={(e) => formatData(e.target.value)} />
  }
  ```

- **B. Leverage Stable Library Utilities**  
  Libraries like TanStack Query provide functions (`mutate`, `mutateAsync`) that are already guaranteed to be referentially stable. Use them directly instead of wrapping them.
  ```tsx
  // ✅ BETTER: Alias the stable function directly. No useCallback required.
  const logout = logoutMutation.mutate
  ```

- **C. Type-Matching in Context Providers**  
  When creating wrapper functions inside a Context Provider (which is already a dynamic object changing on state updates), use regular arrow functions. If TypeScript requires strict type alignment, align the types in the wrapper without overhead:
  ```tsx
  return (
    <AuthContext
      value={{
        // ✅ CLEAN: Simple arrow function to satisfy types. No overhead.
        login: async (credentials) => {
          await loginMutation.mutateAsync(credentials)
        },
        logout: logoutMutation.mutate
      }}
    >
      {children}
    </AuthContext>
  )
  ```

---

## 2. 📝 TanStack Form: State Subscription (`useSelector` vs `useStore`)

### 🚫 The Rule
> **`useStore` is deprecated in `@tanstack/react-form` in favor of `useSelector`.** Always import and use `useSelector`.

```tsx
// 🚫 DEPRECATED:
import { useForm, useStore } from '@tanstack/react-form'
const formValues = useStore(form.store, (s) => s.values)

// ✅ PREFERRED:
import { useForm, useSelector } from '@tanstack/react-form'
const formValues = useSelector(form.store, (s) => s.values)
const formErrors = useSelector(form.store, (s) => s.errorMap)
const isSubmitting = useSelector(form.store, (s) => s.isSubmitting)
```

---

## 3. 🔄 TanStack Query: Single Source of Truth & Callbacks de Mutação

### 🚫 The Rule
> **Never repeat `useMutation` or create nested mutations when an upstream hook owns the mutation lifecycle. Além disso, aproveite o gerenciamento nativo de erros e estados do TanStack Query em vez de try/catch manuais redundantes.**

1. **Gestão de Erros Nativa:** O TanStack Query atualiza automaticamente os estados reativos `error`, `isError`, `isPending` e `isSuccess`. Evite criar estados locais paralelos como `const [submitError, setSubmitError] = useState(...)` para replicar o que `mutation.error` já fornece.
2. **Callbacks em `mutate(variables, options)`:** Para disparar ações efêmeras de UI acopladas à invocação (ex: exibir toast, fechar modal pós-sucesso, redirecionar), utilize o segundo argumento `options` de `mutate()`:
   ```tsx
   mutate(payload, {
     onSuccess: (data) => {
       notifySuccess()
       closeModal()
     },
     onError: (error) => {
       // Opcional caso necessite de tracking pontual,
       // pois mutation.error já atualiza a UI reativamente
     }
   })
   ```
3. **`mutate` vs `mutateAsync`:**
   - Prefira `mutate(variables, options)` na maioria dos formulários e handlers de eventos onde o TanStack Query gerencia o ciclo e os callbacks.
   - Use `mutateAsync` somente quando for imperativo encadear promises com `Promise.all` ou quando um orquestrador precisar do valor resolvido diretamente.

```tsx
// ✅ PREFERRED: Invocar mutate() com options no onSubmit e renderizar error do hook na UI
const { updateConfig, isUpdating, updateError } = useUpdateProviderConfigMutation()

const form = useForm({
  onSubmit: ({ value }) => {
    updateConfig(value, {
      onSuccess: () => {
        setSaveSuccessMessage('Salvo!')
        setTimeout(onSuccess, 800)
      }
    })
  }
})

// Na renderização:
{updateError ? <ErrorMessage message={updateError.message} /> : null}
```

---

## 4. 🧭 Type-Safe Routing & Command Palette Actions (Template Literal Types)

### 🚫 The Rule
> **Never work with routes or command palette actions as untyped magic strings.**
> Use **Template Literal Types** for route safety, provide centralized route builders, and use strongly-typed unions or constants for command palette actions.

### Why Magic Strings Hurt
1. **Silent Runtime 404s**: Typos like `navigate('filmes/123')` or `navigate('/loginn')` pass compile-time checks without error.
2. **Brittle Refactoring**: Changing a path requires finding and replacing scattered plain string literals across the codebase.
3. **Ambiguous Action Dispatchers**: Passing raw `string` to action handlers leaves callers unsure whether a string represents a route, an event ID, or a system command.

### ✅ Route Typing with Template Literal Types

Define strict application route types in `src/routes/routes.types.ts`:

```ts
/** Rotas estáticas */
export type StaticRoute = '/' | '/login'

/** Rotas dinâmicas parametrizadas via Template Literal Type */
export type DynamicMovieRoute = `/filmes/${string | number}`

/** Rotas com query string via Template Literal Type */
export type FilteredCatalogRoute = `/?genre=${string}` | `/?${string}`

/** União mestra de todas as rotas válidas */
export type AppRoute = StaticRoute | DynamicMovieRoute | FilteredCatalogRoute

/** Construtores centralizados de rota (zero strings mágicas no código do componente) */
export const routes = {
  home: () => '/' as const,
  login: () => '/login' as const,
  movieDetail: (id: string | number): DynamicMovieRoute => `/filmes/${id}`,
  catalogGenre: (genre: string): FilteredCatalogRoute => `/?genre=${encodeURIComponent(genre)}`,
} as const
```

---

## 5. 📦 Single Source of Truth para Tipos (Evitar Re-exportações Vazadas)

### 🚫 The Rule
> **Não re-exporte tipos que pertencem a outros domínios ou módulos de infraestrutura.**
> Módulos de feature (como `command-palette`) devem exportar **apenas** o que produzem e pertencem ao seu próprio domínio.

### Por que re-exportar tipos externos é prejudicial?
1. **Quebra a Única Fonte da Verdade (SSOT)**: Se `AppRoute` puder ser importado tanto de `@/routes/routes.types` quanto de `@/features/command-palette/types/command-palette.types`, a base de código perde padronização e previsibilidade.
2. **Vazamento de Fronteiras (Leaky Abstractions)**: Uma feature passa a atuar acidentalmente como proxy de tipos globais de roteamento.
3. **Refatorações confusas**: Ao mover ou refatorar uma feature, outros arquivos que importavam tipos globais através dela quebram desnecessariamente.

```ts
// 🚫 BAD: Re-exportar tipos de roteamento dentro do módulo de command-palette
import type { AppRoute } from '@/routes/routes.types'
export type CommandRouteAction = AppRoute
export type { AppRoute } // Anti-padrão: poluindo a API pública da feature

// ✅ GOOD: Apenas consuma o tipo e exporte os tipos do domínio da feature
import type { AppRoute } from '@/routes/routes.types'
export type CommandRouteAction = AppRoute
```

---

## 6. 🏷️ Padrão Canônico TanStack Query: Nomenclatura, Separação e QueryKeys

### 🚫 As Regras de Ouro
1. **Sufixos Obrigatórios de Nomenclatura:**
   - Hooks de consulta (leitura) **devem** obrigatoriamente terminar com o sufixo `Query` (ex: `useProviderConfigQuery`, `useThreadHistoryQuery`).
   - Hooks de mutação (escrita/ações) **devem** obrigatoriamente terminar com o sufixo `Mutation` (ex: `useUpdateProviderConfigMutation`, `useTestProviderProbeMutation`).
2. **Separação Estrita (Sem Hooks Híbridos):**
   - É **terminantemente proibido** misturar `useQuery` e `useMutation` no mesmo hook customizado (ex: um `useSettings` que retorna tanto `config` quanto `updateConfig`). Cada hook tem uma responsabilidade única e atômica.
3. **Constantes de `queryKeys` por Feature Slice:**
   - Cada slice deve exportar um objeto de chave canônica (ex: `settingsQueryKeys.provider()`, `chatQueryKeys.threads()`) em `api/[feature]QueryKeys.ts` ou arquivo dedicado, garantindo tipagem estrita com `as const` e evitando strings mágicas espalhadas pelo código.
4. **Hooks Limpos e Enxutos (Clean Hooks):**
   - **Exponha apenas o que os componentes realmente consomem.**
   - Não repasse propriedades como `isError`, `error`, `refetch`, etc., se a view consumidora não as utiliza. Adicione propriedades ao retorno do hook somente sob demanda concreta de negócio.

---

## 7. 🛡️ Integridade de Componentes e Proibição de Desvios (Anti-Bypass de Botões)

### 🚫 A Regra
> **Nunca substitua elementos semânticos de ação/clique por `<span>`, `<div>` ou invólucros genéricos para tentar contornar regras do linter (`shadcn/no-restyle`).**

Se um elemento executa ação, seleção ou clique:
- Ele deve ser semanticamente um `<Button>`.
- Caso seja necessário um novo tratamento visual (ex: opção selecionável em grade, botão com card-style, pílula de ordenação), **adicione a variante ou o tamanho oficial diretamente em `src/components/ui/button.tsx`**.
- Nunca use `onClick` em `<span>` ou `<div>` quando a semântica for de um botão de ação.
- Nunca envolva botões inteiros em `<span>` para escapar de verificações de botão.

---

## 8. 📝 Formulários Tipados: TanStack Form + Zod

### Padrão Oficial:
- Todo formulário com mais de 1 campo ou regras de validação deve ser construído com `@tanstack/react-form` integrado a schemas **Zod** (`src/features/[slice]/schemas/[nome].schema.ts`).
- Validação no schema Zod com inferência automática de tipos via `z.infer<typeof schema>`.
- Para ler valores ou estados do formulário de forma reativa e performática, utilize sempre `useSelector(form.store, (state) => ...)` (o método legado `useStore` é proibido).

---

## 9. 🧰 Adoção Mandatória e Preferência por Utilitários do `@reactuses/core`

### 🚫 A Regra de Ouro
> **Antes de implementar lógica manual de ciclo de vida (`useEffect`), manipuladores de eventos (`window.addEventListener`), timeouts, debounce ou estados de montagem, verifique e utilize os utilitários da biblioteca `@reactuses/core`.** 
link: https://reactuse.com/effect/useeventlistener/
tal nao deve ser confundidada com a legado `react-uses`

Reinventar comportamentos comuns com `useEffect` imperativos na mão aumenta a chance de memory leaks, desmontagens incorretas e código boilerplate.

### Utilitários recomendados por caso de uso:
1. **Atalhos de teclado e eventos de janela:**
   - Use `useKey('Escape', handler)` em vez de registrar `window.addEventListener('keydown', ...)`.
2. **Timers e Atrasos Controlados:**
   - Use `useTimeoutFn` ou `useInterval` em vez de chamar `setTimeout` / `setInterval` na mão com `clearTimeout` manual.
3. **Prevenção de Race Conditions e Memory Leaks:**
   - Use `useMountedState()` para checar se o componente continua montado antes de atualizar estados pós promises/ações assíncronas.
4. **Entradas de Usuário e Debounce:**
   - Use `useDebounce` para atrasar disparos de busca ou filtros em tempo real.
5. **Fechamento ao clicar fora:**
   - Use `useClickAway` em popovers, drawers ou menus flutuantes.
6. **Área de Transferência:**
   - Use `useCopyToClipboard` para ações de copiar chave/código com feedback imediato.



