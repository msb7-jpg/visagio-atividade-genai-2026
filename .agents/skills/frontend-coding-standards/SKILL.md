---
name: frontend-coding-standards
description: Diretrizes e padrões arquiteturais para frontend moderno em React 19 e TypeScript: arquitetura de fatias (Vertical Slices), descoberta e reuso de componentes (Shadcn, Aceternity UI, Base UI), governança de estado assíncrono (TanStack Query v5), React 19, motion/react, anti-god components e linters de design system. Use ao planejar, arquitetar, implementar ou refatorar componentes, hooks, telas, formulários ou queries no frontend.
---

# Padrões Arquiteturais e Boas Práticas de Frontend (React 19 & TypeScript)

Este documento atua como o **HUB Central de Diretrizes de Frontend**, estabelecendo os princípios inegociáveis e roteando para guias técnicos detalhados sob demanda (*Progressive Disclosure*).

---

## 🧭 Mapa de Navegação e Sub-Referências

Consulte a referência correspondente para diretrizes aprofundadas:

| O que você está desenvolvendo ou ajustando? | Referência Especializada |
|---|---|
| **Fatias verticais (`features/`), anti-god components, anti-god hooks e padrão Headless Controller** | 👉 [`references/architecture-and-slices.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/architecture-and-slices.md) |
| **Pesquisa e reuso de UI, Shadcn, Registries (Aceternity UI), `@base-ui/react` e `design-system.lint.json`** | 👉 [`references/components-and-registries.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/components-and-registries.md) |
| **Data fetching com TanStack Query v5, `queryOptions`, factories de keys, cancelamento via `signal` e mutações** | 👉 [`references/async-state-and-query.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/async-state-and-query.md) |
| **Conformidade com React 19 (sem `React.FC`/`forwardRef`), eliminação de `useEffect` e `@reactuse/core`** | 👉 [`references/react19-and-performance.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/react19-and-performance.md) |
| **Early returns, fluxos JSX planos, eliminação de ternários aninhados e animações com `motion/react`** | 👉 [`references/jsx-flow-and-motion.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/jsx-flow-and-motion.md) |
| **Construção de formulários reativos, Zod v4 schemas e fencing de submit com `@tanstack/react-form`** | 👉 [`references/forms-and-validation.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/forms-and-validation.md) |

---

## ⚡ Princípios Inegociáveis (Core Rules)

1. **Nunca Reinvente Componentes de UI do Zero:**
   - Verifique primeiro `src/components/ui/` (ex: `tooltip-card.tsx`).
   - Verifique o catálogo oficial do Shadcn via CLI (`bunx --bun shadcn@latest search <termo>`).
   - Consulte registries consolidados da comunidade como **Aceternity UI** (`ui.aceternity.com`), 21st.dev ou Magic UI.
2. **Governança do Design System (`design-system.lint.json`):**
   - É expressamente proibido usar elementos HTML puros (`<button>`, `<input>`) fora de `src/components/ui/`.
   - **Preservação da intenção do design:** Nunca troque uma cor específica por outra variável aleatória para silenciar o linter. Registre a variável semântica no CSS se necessário.
3. **Padrão Canônico de Animação: `motion/react`:**
   - Importe sempre de `motion/react` (`import { motion } from 'motion/react'`). O pacote legado `framer-motion` é terminantemente proibido.
4. **Sem Barrel Files (`index.ts`):**
   - É proibido criar arquivos `index.ts` que agregam e re-exportam componentes dentro de features. Importe o arquivo do componente diretamente para evitar loops e inchaço de bundle.
5. **TanStack Query Disciplinado:**
   - Queries (`*Query`) separadas de Mutações (`*Mutation`).
   - Use `queryOptions` para composições reutilizáveis e passe o `signal` para o `fetch` para cancelamento automático.
   - Aplique fencing imediato em botões durante mutações (`disabled={isPending}`).
6. **React 19 & Performance:**
   - Proibido `React.FC` e `forwardRef` (use funções puras e `ref` nativo).
   - Não use `useEffect` para calcular estado derivado que pode ser calculado no render.
   - Prefira utilitários consolidados de `@reactuse/core` antes de escrever efeitos com timers manuais.

---

## 📊 Matriz Resumo / Cheat Sheet

| Sintoma / Cenário | Ação Recomendada | Referência |
|---|---|---|
| Precisa de um componente visual complexo | Buscar em `components/ui/` $\to$ Shadcn $\to$ Aceternity UI | [`components-and-registries.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/components-and-registries.md) |
| Componente ultrapassou 150–200 linhas | Decompor em subcomponentes ou extrair headless hook | [`architecture-and-slices.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/architecture-and-slices.md) |
| Fazendo busca de dados de API | Usar `queryOptions` do TanStack Query v5 com `signal` | [`async-state-and-query.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/async-state-and-query.md) |
| Linter acusou cor arbitrária no Tailwind | Cadastrar variável semântica no CSS (`index.css`) | [`components-and-registries.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/components-and-registries.md) |
| Animação ou transição visual | Usar wrappers com `motion/react` (nunca `framer-motion`) | [`jsx-flow-and-motion.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/jsx-flow-and-motion.md) |
| Efeito manual com `setTimeout`/`addEventListener` | Substituir por hook do `@reactuse/core` | [`react19-and-performance.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/react19-and-performance.md) |
