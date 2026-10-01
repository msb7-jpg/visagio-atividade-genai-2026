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
* **Espaçamento de Tags e Iguais (`jsx-tag-spacing`, `jsx-equals-spacing`):** `<Component prop="val" />`, sem espaços espúrios ao redor de `=` ou dentro das tags.
* **Wrap de Multilinhas (`jsx-wrap-multilines`):** JSX multilinhas em returns e condicionais sempre envolvido em parênteses.

