# Guia de Resolução de Erros e Padrões de Linting (Frontend)

Este guia serve como referência rápida para desenvolvedores e agentes de IA sobre as regras ativas de ESLint, formatação e políticas do design system em `frontend/`.

---

## 1. Comandos Rápidos

| Ação | Comando |
| :--- | :--- |
| **Diagnóstico Geral** | `bun run lint` |
| **Diagnóstico Silencioso (Apenas Erros)** | `bunx eslint --quiet src/` |
| **Correção Automática de Formatação** | `bunx eslint --fix src/` |
| **Verificação de Build & Tipagem** | `bun run build` |

---

## 2. Guardrails do Design System (`@shadcn/lint`)

### 🚫 `shadcn/no-restyle` — Sem Variantes Ad-hoc
* **A regra:** Componentes do shadcn/ui (`Button`, `Badge`, `Card`, etc.) gerenciam seu próprio preenchimento, bordas e cores.
* **O erro clássico:** Criar variantes hiper-específicas de tela (como `chat-variant` ou `chat-send`) dentro de `buttonVariants`, ou injetar classes visuais via `className` (`<Button className="p-8 bg-blue-600 rounded-full">`).
* **Como resolver:**
  1. Use os tamanhos e variantes padronizados do componente (`variant="outline"`, `size="sm"`).
  2. Ajuste apenas posicionamento e dimensões de **layout** no pai (`className="mx-auto max-w-md"`).
  3. Se precisar de espaçamento interno para ícones ou textos, envolva o conteúdo em um container interno:
     ```tsx
     // ✅ CORRETO
     <Button variant="secondary">
       <span className="flex items-center gap-2">
         <SendIcon />
         Enviar
       </span>
     </Button>
     ```

### 🚫 `shadcn/no-raw-colors` — Sem Cores Tailwind Brutas
* **A regra:** Nunca use classes de cores brutas (`bg-blue-500`, `text-emerald-400`, `border-zinc-800`).
* **Como resolver:** Use estritamente os tokens semânticos definidos em `ui/DESIGN.md`:
  * Fundo: `bg-background`, `bg-card`, `bg-muted`
  * Texto: `text-foreground`, `text-card-foreground`, `text-muted-foreground`
  * Acentos: `bg-primary`, `text-primary-foreground`

### 🚫 `shadcn/no-arbitrary-values` & `shadcn/no-inline-styles`
* Não use colchetes arbitrários (`p-[13px]`, `w-[320px]`). Utilize a escala nativa (`p-3`, `w-80`).
* Não use `style={{ ... }}` inline.

---

## 3. Anti-Bypass de Design System (`react/forbid-elements`)

* **A regra:** Em pastas de features e páginas (`src/features/**`, `src/routes/**`), é **proibido** utilizar tags HTML nativas (`<button>`, `<input>`, `<select>`, `<textarea>`).
* **Por quê:** Agentes de IA costumam burlar o shadcn escrevendo tags nativas com dezenas de utilitários Tailwind inline quando encontram restrições de restyle.
* **Como resolver:** Importe os componentes canônicos:
  ```tsx
  // ❌ ERRADO
  <button type="submit" onClick={handleClick}>Enviar</button>

  // ✅ CORRETO
  import { Button } from '@/components/ui/button'
  <Button type="submit" onClick={handleClick}>Enviar</Button>
  ```
  *(Arquivos dentro de `src/components/ui/**` possuem isenção automática dessa regra).*

---

## 4. Modern React 19 Standards

1. **Sem `React.FC` ou `React.FunctionComponent`:**
   ```tsx
   // ❌ ERRADO
   export const MyCard: React.FC<CardProps> = ({ title }) => ...

   // ✅ CORRETO
   export function MyCard({ title }: CardProps) { ... }
   ```
2. **Sem `forwardRef`:**
   ```tsx
   // ❌ ERRADO (React < 19)
   export const Input = React.forwardRef((props, ref) => <input ref={ref} ... />)

   // ✅ CORRETO (React 19)
   export function Input({ ref, ...props }: InputProps) {
     return <input ref={ref} {...props} />
   }
   ```
3. **Sem `<Context.Provider>`:**
   ```tsx
   // ❌ ERRADO: <ThemeContext.Provider value={theme}>
   // ✅ CORRETO: <ThemeContext value={theme}>
   ```
4. **React Compiler:**
   O React Compiler está ativo no Vite. Evite `useCallback` ou `useMemo` defensivos manuais desnecessários, a menos que sejam dependências estritas de bibliotecas externas.

---

## 5. Nomes Descritivos vs. Nomes de 1 Letra (`id-length`)

* **A regra:** Variáveis, parâmetros de função e callbacks de array (`.map()`, `.filter()`, etc.) **devem ter no mínimo 2 caracteres**.
* **O erro clássico:**
  ```tsx
  // ❌ ERRADO — Nomes crípticos de 1 letra
  const a = 10
  const list = items.map((a) => a.length)
  const filtered = users.filter((u) => u.isActive)
  function handle(e) { ... }
  ```
* **Como resolver:** Use identificadores descritivos ou nomes completos:
  ```tsx
  // ✅ CORRETO
  const count = 10
  const list = items.map((item) => item.length)
  const filtered = users.filter((user) => user.isActive)
  function handle(event) { ... }

  // Exceção permitida: '_' para parâmetros intencionalmente ignorados
  const names = items.map((_, index) => `Item ${index}`)
  ```

---

## 6. Imports Absolutos Obrigatórios (`no-restricted-imports`)

Sempre utilize o alias `@/*` para importar módulos da aplicação, evitando caminhos relativos profundos (`../../..`):

```tsx
// ❌ ERRADO
import { Button } from '../../components/ui/button'

// ✅ CORRETO
import { Button } from '@/components/ui/button'
```

---

## 7. Formatação de Código e JSX (`@stylistic`)

* **Aspas em Código vs. JSX:** Aspas simples no TypeScript (`'exemplo'`), mas **aspas duplas em atributos JSX** (`className="p-4"`, `id="chat"`), alinhado ao padrão da indústria.
* **Ponto e Vírgula:** Sem ponto e vírgula (`semi: never`).
* **Indentação:** 2 espaços no código e nas props de JSX (`jsx-indent-props: 2`).
* **Trailing Commas:** Sem vírgula final (`comma-dangle: never`).
* **Tags Auto-Fecháveis (`jsx-self-closing-comp`):** Tags sem filhos fecham sozinhas: `<Button />` em vez de `<Button></Button>`.
* **Sem Chaves Redundantes (`jsx-curly-brace-presence`):** `prop="texto"` em vez de `prop={'texto'}`.
* **Boolean Shorthand (`react/jsx-boolean-value`):** `<Button disabled />` em vez de `<Button disabled={true} />`.
* **Fragment Shorthand (`react/jsx-fragments`):** `<>...</>` em vez de `<React.Fragment>...</React.Fragment>`.
* **Alinhamento de Fechamento (`jsx-closing-bracket-location`):** O `>` de tags multilinhas alinha com a abertura da tag.
* **1 Prop por Linha em Multilinhas (`jsx-max-props-per-line`):** Quando props quebram linha, cada uma ganha sua própria linha para diffs limpos no Git.
* **Wrap de Multilinhas (`jsx-wrap-multilines`):** JSX multilinhas em returns e condicionais sempre envolvido em parênteses.

---

## 8. Padrão TanStack Query (Nomenclatura, Separação & Clean Hooks)

1. **Sufixo Obrigatório:** Todo hook que utiliza `useQuery` deve terminar com `Query` (ex: `useProviderConfigQuery`). Todo hook com `useMutation` deve terminar com `Mutation` (ex: `useUpdateProviderConfigMutation`).
2. **Separação Estrita:** Nunca junte `useQuery` e `useMutation` em um mesmo hook. Mantenha-os em arquivos e funções isoladas.
3. **Query Keys Centralizadas:** Use sempre a fábrica de chaves da feature (ex: `settingsQueryKeys.provider()`).
4. **Clean Hooks:** Exponha somente o que é utilizado. Se a tela não precisa de `isError` ou `error`, omita-os do retorno.

---

## 9. Anti-Bypass de Botões & Componentes de Ação

* **A regra:** Ações interativas, seleções e cliques pertencem ao `<Button>`.
* **Proibição estrita:** É vedado trocar um `<Button>` por `<span>` com `onClick` ou `<div>` para evitar mensagens do linter.
* **Resolução correta:** Adicione as variantes necessárias (como `card-option` ou `pill`) em `src/components/ui/button.tsx` para manter o código 100% semântico e acessível.

---

## 10. A Armadilha de `react-hooks/exhaustive-deps`: O Mito do "Erro na Regra" e a Anatomia dos Loops Infinitos

### 🛑 O Sintoma Clássico
Ao escrever um `useEffect` que consome uma função definida fora dele (por exemplo, retornada de um custom hook ou passada via props):
```tsx
useEffect(() => {
  if (!currentDetail) return
  loadThreadMessages(currentDetail.thread_id, currentDetail.title, viewMessages)
}, [currentDetail, viewMessages])
```
O linter dispara o aviso:
> `React Hook useEffect has a missing dependency: 'loadThreadMessages'. Either include it or remove the dependency array. (react-hooks/exhaustive-deps)`

---

### 🪤 A Falsa Premissa e o "Auto-Fix" Destrutivo
Muitos desenvolvedores e assistentes de IA assumem erroneamente que:
1. *"O linter está sendo excessivamente burocrático e reclamando sem motivo."*
2. *"Vou apenas aceitar a sugestão rápida da IDE (Quick Fix) ou executar `eslint --fix` para silenciar o linter."*

Ao aceitar a sugestão cega:
```tsx
useEffect(() => {
  if (!currentDetail) return
  loadThreadMessages(currentDetail.thread_id, currentDetail.title, viewMessages)
}, [currentDetail, viewMessages, loadThreadMessages]) // ⚠️ BOMBA-RELÓGIO ADICIONADA
```

---

### 💥 A Reação em Cadeia (Por que o App Congela e Sofre "Tearing"?)
Se `loadThreadMessages` foi declarada no hook de origem como uma função normal (sem `useCallback`):
1. **Instabilidade Referencial:** Em cada ciclo de renderização do componente ou hook pai, o JavaScript aloca uma **nova closure na memória** para `loadThreadMessages`. Para o React, `Object.is(oldFn, newFn) === false`.
2. **Execução Imediata do Efeito:** Como a referência da função mudou na comparação do array de dependências, o `useEffect` executa novamente.
3. **Disparo de `setState`:** O corpo do efeito chama `loadThreadMessages(...)`, que internamente executa `setState(...)`.
4. **Re-renderização em Cascata:** O `setState` força o componente ou hook pai a re-renderizar. Nova referência de função é alocada.
5. **Loop Infinito Síncrono:** O `useEffect` dispara novamente. O ciclo se repete milhares de vezes por segundo.
6. **Esgotamento do Event Loop (Event Loop Starvation):**
   - O thread principal do navegador é monopolizado pela fila ininterrupta de microtasks e renderizações do React.
   - O browser **não ganha tempo de CPU para repintar a tela** nem processar novos eventos de entrada (`pointerleave`, `click`).
   - Botões clicados ficam travados com o aspecto visual de `:hover` ou `:active`.
   - Mudanças de URL (via `history.pushState` / `replaceState`) entram em disputa e alternam descontroladamente ("tearing").
   - Ferramentas de inspeção (como Chrome DevTools) tomam *timeout* de 10 segundos porque o runtime não responde.

---

### 💡 A Realidade: O Linter Não Estava Errado!
O linter **nunca esteve errado**:
* A regra `exhaustive-deps` existe precisamente para alertar: *"Seu efeito depende de uma função cuja identidade o React não pode garantir que seja estável"*.
* O erro **não estava na regra do linter**, mas sim na **falta de identidade estável (`useCallback`) na função de origem** e na ausência de uma **guarda de idempotência**!

---

### ✅ Como Resolver Corretamente (Checklist de 3 Passos)

#### 1. Estabilize a Função com `useCallback` no Hook de Origem
Sempre que uma função exportada por um hook ou componente puder ser consumida dentro de um `useEffect`, envolva-a obrigatoriamente com `useCallback`:
```tsx
// ✅ No hook de origem (ex: useAgentStream.ts):
const loadThreadMessages = useCallback(
  (threadId: string, title: string, loadedMessages: ChatMessageItem[]) => {
    setActiveThreadId(threadId)
    setActiveTitle(title)
    setMessages(loadedMessages)
  },
  [setActiveThreadId, setActiveTitle, setMessages]
)
```

#### 2. Adicione Guarda de Idempotência (Reentrancy Guard)
Efeitos disparados por sincronização devem ser **idempotentes**. Antes de disparar mutações ou carregamentos, certifique-se de que a operação já não foi realizada:
```tsx
// ✅ No componente consumidor (ex: useChatSync.ts):
useEffect(() => {
  if (!currentDetail || isStreaming) return
  // Guarda: se já estamos posicionados nesta thread, aborte imediatamente
  if (activeThreadId === currentDetail.thread_id) return

  loadThreadMessages(
    currentDetail.thread_id,
    currentDetail.title,
    viewMessages
  )
}, [currentDetail, viewMessages, isStreaming, activeThreadId, loadThreadMessages])
```

#### 3. Avalie se a Função Realmente Precisa Viver Fora do Efeito
Se a função for utilizada **exclusivamente** dentro daquele `useEffect`, mova sua declaração para dentro do corpo do próprio efeito. Dessa forma, ela não precisa entrar no array de dependências e não afeta o ciclo de renderização externo.
```tsx
// ✅ Função interna: dispensa useCallback e dependências externas
useEffect(() => {
  function syncInternalData() {
    // ...
  }
  syncInternalData()
}, [dependencyA])
```

---

### 🛡️ Sobre Customização e Bloqueio de Auto-Fix no ESLint

* **É possível desativar o auto-fix?**  
  Sim! Por padrão no ESLint CLI, os próprios criadores do `eslint-plugin-react-hooks` deixam o auto-fix perigoso desativado através da flag interna `enableDangerousAutofixThisMayCauseInfiniteLoops = false`. No entanto, em IDEs (como VS Code), o plugin expõe `meta.hasSuggestions = true`, o que oferece o "Quick Fix" no menu de lâmpada. Podemos desabilitar completamente essa sugestão automática no `eslint.config.js` envolvendo a regra (`wrapper`) para remover as propriedades `fix` e `suggest` do relatório, forçando o desenvolvedor a refletir sobre a estabilidade referencial antes de adicionar dependências.
* **É possível customizar a mensagem de erro?**  
  Nativamente, o `eslint-plugin-react-hooks` não possui opção de mensagem customizada via schema de configuração. Porém, interceptando o método `context.report` através de um wrapper de regra no `eslint.config.js`, podemos enriquecer o texto do aviso adicionando um alerta explícito sobre a necessidade de `useCallback` e o risco de loops infinitos.


