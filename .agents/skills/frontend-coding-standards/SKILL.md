---
name: frontend-coding-standards
description: Architectural guidelines and best practices for modern frontend with React 19 and TypeScript: Vertical Slices architecture, component discovery and reuse (Shadcn, Aceternity UI, Base UI), asynchronous state governance (TanStack Query v5), React 19, motion/react, anti-god components, and design system linters. Use when planning, architecting, implementing, or refactoring frontend components, hooks, views, forms, or queries.
---

# Frontend Architectural Standards and Best Practices (React 19 & TypeScript)

This document serves as the **Central Hub for Frontend Guidelines**, establishing non-negotiable principles and routing to detailed technical guides on demand (*Progressive Disclosure*).

---

## 🧭 Navigation Map and Sub-References

Consult the corresponding reference for in-depth guidelines:

| What are you developing or refactoring? | Specialized Reference |
|---|---|
| **Vertical slices (`features/`), anti-god components, anti-god hooks, and the Headless Controller pattern** | 👉 [`references/architecture-and-slices.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/architecture-and-slices.md) |
| **UI research and reuse, Shadcn, Registries (Aceternity UI), `@base-ui/react`, and `design-system.lint.json`** | 👉 [`references/components-and-registries.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/components-and-registries.md) |
| **Data fetching with TanStack Query v5, `queryOptions`, key factories, cancellation via `signal`, and mutations** | 👉 [`references/async-state-and-query.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/async-state-and-query.md) |
| **React 19 compliance (no `React.FC`/`forwardRef`), eliminating `useEffect`, and `@reactuse/core`** | 👉 [`references/react19-and-performance.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/react19-and-performance.md) |
| **Early returns, flat JSX flows, eliminating nested ternaries, and animations with `motion/react`** | 👉 [`references/jsx-flow-and-motion.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/jsx-flow-and-motion.md) |
| **Building reactive forms, Zod v4 schemas, and submit fencing with `@tanstack/react-form`** | 👉 [`references/forms-and-validation.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/forms-and-validation.md) |

---

## ⚡ Non-Negotiable Principles (Core Rules)

1. **Never Reinvent UI Components from Scratch:**
   - First check `src/components/ui/` (e.g., `tooltip-card.tsx`).
   - Check the official Shadcn catalog via the CLI (`bunx --bun shadcn@latest search <term>`).
   - Check consolidated community registries such as **Aceternity UI** (`ui.aceternity.com`), 21st.dev, or Magic UI.
2. **Design System Governance (`design-system.lint.json`):**
   - Using raw HTML elements (`<button>`, `<input>`) outside of `src/components/ui/` is strictly prohibited.
   - **Preserve design intent:** Never replace a specific color with an arbitrary variable just to silence the linter. Register the semantic variable in CSS if necessary.
3. **Canonical Animation Standard: `motion/react`:**
   - Always import from `motion/react` (`import { motion } from 'motion/react'`). The legacy package `framer-motion` is strictly forbidden.
4. **No Barrel Files (`index.ts`):**
   - Creating `index.ts` files that aggregate and re-export components within features is prohibited. Import the component file directly to avoid circular imports and bundle bloat.
5. **Disciplined TanStack Query:**
   - Separate Queries (`*Query`) from Mutations (`*Mutation`).
   - Use `queryOptions` for reusable compositions and pass `signal` to `fetch` for automatic request cancellation.
   - Apply immediate fencing to buttons during mutations (`disabled={isPending}`).
6. **React 19 & Performance:**
   - `React.FC` and `forwardRef` are prohibited (use standard functions and native `ref`).
   - Do not use `useEffect` to compute derived state that can be calculated during render.
   - Prefer consolidated utilities from `@reactuse/core` before writing manual effects with timers.

---

## 📊 Summary Matrix / Cheat Sheet

| Symptom / Scenario | Recommended Action | Reference |
|---|---|---|
| Need a complex visual component | Search `components/ui/` $\to$ Shadcn $\to$ Aceternity UI | [`components-and-registries.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/components-and-registries.md) |
| Component exceeds 150–200 lines | Decompose into subcomponents or extract a headless hook | [`architecture-and-slices.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/architecture-and-slices.md) |
| Fetching data from an API | Use TanStack Query v5 `queryOptions` with `signal` | [`async-state-and-query.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/async-state-and-query.md) |
| Linter flagged an arbitrary Tailwind color | Register semantic variable in CSS (`index.css`) | [`components-and-registries.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/components-and-registries.md) |
| Visual animation or transition | Use wrappers with `motion/react` (never `framer-motion`) | [`jsx-flow-and-motion.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/jsx-flow-and-motion.md) |
| Manual effect with `setTimeout`/`addEventListener` | Replace with a hook from `@reactuse/core` | [`react19-and-performance.md`](file:///home/miguel/workspace/visagio-atividade-genai-2026/.agents/skills/frontend-coding-standards/references/react19-and-performance.md) |
