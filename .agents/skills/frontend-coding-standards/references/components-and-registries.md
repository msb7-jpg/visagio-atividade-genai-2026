# Reference: Component Discovery, Shadcn Registries (Aceternity), and Design System Governance

This guide outlines the mandatory workflow for creating and consuming UI components: **never invent from scratch before exploring the existing ecosystem**, while adhering to strict visual governance rules and linters.

---

## 1. Decision Flow: "Never Reinvent the Wheel"

Before writing any complex visual component (e.g., rich tooltips with screen clamping, spring-physics modals, interactive buttons, carousels, metric cards, or bento grids), strictly follow this search hierarchy:

```text
1. Does it already exist in src/components/ui/ or src/components/animations/?
   └── YES ➔ Reuse or compose directly.
   └── NO  ➔ Proceed to step 2.

2. Does it exist in the official shadcn/ui catalog?
   └── Run: bunx --bun shadcn@latest search <term>
   └── YES ➔ Add via: bunx --bun shadcn@latest add <component>
   └── NO  ➔ Proceed to step 3.

3. Does it exist in Community Registries (Aceternity UI, 21st.dev, Magic UI)?
   └── Check established references like Aceternity UI (e.g., TooltipCard, Spotlight, Lamp).
   └── Adapt the source code following project standards (see Section 2).
   └── Save the primitive to src/components/ui/<kebab-name>.tsx.
```

---

## 2. Adapting External Components to the Repository Ecosystem

When importing or porting components from **Aceternity UI**, **21st.dev**, or **Magic UI**, apply the following compliance rules:

1. **Animations: Only `motion/react`:**
   - ❌ **Prohibited:** `import { motion } from 'framer-motion'`. The `framer-motion` package is deprecated in favor of `motion`.
   - ✅ **Mandatory:** `import { motion, AnimatePresence } from 'motion/react'`.
2. **Accessible Primitives: `@base-ui/react`:**
   - The repository uses `@base-ui/react` (`base-lyra` style configured in `components.json`). Integrate accessible primitives through Base UI whenever the component requires keyboard navigation, focus management, or portals.
3. **Standardized Icons:**
   - Prefer icons from `@phosphor-icons/react` (configured in `components.json`) or `lucide-react`.
4. **Utility Classes and Merging:**
   - Always use `cn(...)` from `@/lib/utils` for merging Tailwind classes with `clsx` and `tailwind-merge`.

### Success Example in the Project: `TooltipCard` (Aceternity UI)
The [`src/components/ui/tooltip-card.tsx`](file:///home/miguel/workspace/visagio-atividade-genai-2026/frontend/src/components/ui/tooltip-card.tsx) component was adapted directly from Aceternity UI:
- Uses `motion/react` with smooth spring physics (`spring`, stiffness 200, damping 20).
- Uses `createPortal` to render into `document.body`, avoiding z-index stacking or overflow clipping issues.
- Implements deterministic screen boundary clamping calculation (`window.innerWidth`, `window.innerHeight`).

---

## 3. Design System Governance (`design-system.lint.json`)

The [`design-system.lint.json`](file:///home/miguel/workspace/visagio-atividade-genai-2026/frontend/design-system.lint.json) file enforces aesthetic consistency across the project via `@shadcn/lint`. The agent must adhere to these rules:

### 3.1 Prohibition of Bypassing Native HTML Elements
- Using raw HTML tags such as `<button>`, `<input>`, `<select>`, or `<textarea>` outside of the `src/components/ui/` folder is strictly forbidden.
- **Why?** Native tags bypass accessible states, focus rings, visual variants, and design system tokens. Always use `<Button>`, `<Input>`, etc.

### 3.2 Preserving Design Intent (Semantic Colors)
- ⚠️ **WARNING:** When the linter flags a hardcoded or unauthorized color:
  - ❌ **DO NOT replace** the color with a random variable just to silence the linter (e.g., swapping an accent white for orange/primary and ruining the screen's palette).
  - ✅ **CORRECT ACTION:** Register the new semantic variable in global CSS (`src/index.css`) and use the generated semantic utility class.

### 3.3 Prohibition of Arbitrary Restyling on Base Components
- Do not apply dimension/layout classes (`w-*`, `h-*`, `p-*`, `bg-*`) that alter the character of the base `Button` component. Use variants (`size="sm"`, `size="lg"`, `variant="outline"`).
- If you need a button with an entirely distinct layout, compose it via a dedicated feature wrapper.

---

## 4. References and Recommended Registries

- [Shadcn UI Registry Documentation](https://ui.shadcn.com/docs/registry)
- [Shadcn Official Component Directory](https://ui.shadcn.com/docs/components)
- [Aceternity UI Components](https://ui.aceternity.com/components)
- [Aceternity UI Tooltip Card Source](https://ui.aceternity.com/components/tooltip-card)
- [Base UI Components & Primitives](https://base-ui.com/)
- [Magic UI (React Motion & Tailwind)](https://magicui.design/)
- [21st.dev Design System Registry](https://21st.dev/)
