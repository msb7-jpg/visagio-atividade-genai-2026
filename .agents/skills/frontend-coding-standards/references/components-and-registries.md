# Referência: Descoberta de Componentes, Shadcn Registries (Aceternity) e Governança do Design System

Este guia orienta o fluxo de trabalho obrigatório para criação e consumo de componentes de interface: **nunca inventar do zero antes de pesquisar o ecossistema existente**, respeitando as regras estritas de governança visual e linters.

---

## 1. O Fluxo de Decisão: "Nunca Reinvente a Roda"

Antes de escrever qualquer componente visual complexo (ex: tooltips enriquecidos com clamp de tela, modais com física de mola, botões interativos, carrosséis, cartões de métrica ou bento grids), siga rigorosamente esta hierarquia de busca:

```text
1. Já existe em src/components/ui/ ou src/components/animations/?
   └── SIM ➔ Reutilize ou componha diretamente.
   └── NÃO ➔ Ir para etapa 2.

2. Existe no catálogo oficial do shadcn/ui?
   └── Execute: bunx --bun shadcn@latest search <termo>
   └── SIM ➔ Adicione com: bunx --bun shadcn@latest add <componente>
   └── NÃO ➔ Ir para etapa 3.

3. Existe em Registries da Comunidade (Aceternity UI, 21st.dev, Magic UI)?
   └── Verifique referências consagradas como Aceternity UI (ex: TooltipCard, Spotlight, Lamp).
   └── Adapte o código fonte seguindo os padrões do projeto (veja Seção 2).
   └── Salve a primitiva em src/components/ui/<nome-kebab>.tsx.
```

---

## 2. Adaptação de Componentes Externos ao Ecossistema do Repositório

Ao importar ou portar componentes do **Aceternity UI**, **21st.dev** ou **Magic UI**, aplique as seguintes regras de conformidade:

1. **Animações: Somente `motion/react`:**
   - ❌ **Proibido:** `import { motion } from 'framer-motion'`. O pacote `framer-motion` está descontinuado em favor do `motion`.
   - ✅ **Obrigatório:** `import { motion, AnimatePresence } from 'motion/react'`.
2. **Primitivas Acessíveis: `@base-ui/react`:**
   - O repositório utiliza `@base-ui/react` (estilo `base-lyra` configurado em `components.json`). Integre primitivas acessíveis através do Base UI sempre que o componente exigir teclado, foco ou portais.
3. **Ícones Padronizados:**
   - Dê preferência aos ícones de `@phosphor-icons/react` (configurado em `components.json`) ou `lucide-react`.
4. **Classes Utilitárias e Mesclagem:**
   - Use sempre `cn(...)` de `@/lib/utils` para mesclagem de classes Tailwind com `clsx` e `tailwind-merge`.

### Exemplo de Sucesso no Projeto: `TooltipCard` (Aceternity UI)
O componente [`src/components/ui/tooltip-card.tsx`](file:///home/miguel/workspace/visagio-atividade-genai-2026/frontend/src/components/ui/tooltip-card.tsx) foi adaptado diretamente do Aceternity UI:
- Utiliza `motion/react` com mola suave (`spring`, stiffness 200, damping 20).
- Usa `createPortal` para renderizar no `document.body` evitando problemas de z-index ou clipping de overflow.
- Implementa cálculo determinístico de clamp contra as bordas da tela (`window.innerWidth`, `window.innerHeight`).

---

## 3. Governança do Design System (`design-system.lint.json`)

O arquivo [`design-system.lint.json`](file:///home/miguel/workspace/visagio-atividade-genai-2026/frontend/design-system.lint.json) fiscaliza a integridade estética do projeto através do `@shadcn/lint`. O agente deve respeitar estas regras:

### 3.1 Proibição de Bypass de Elementos HTML Nativos
- É expressamente proibido usar tags HTML cruas como `<button>`, `<input>`, `<select>` ou `<textarea>` fora da pasta `src/components/ui/`.
- **Por quê?** Tags nativas contornam estados acessíveis, foco, variantes visuais e tokens do design system. Use sempre `<Button>`, `<Input>`, etc.

### 3.2 Preservação da Intenção de Design (Cores Semânticas)
- ⚠️ **ATENÇÃO:** Quando o linter sinalizar uma cor direta ou não autorizada:
  - ❌ **NÃO substitua** a cor por uma variável aleatória qualquer só para calar o linter (ex: trocar um branco de destaque por laranja/primary estragando a paleta da tela).
  - ✅ **AÇÃO CORRETA:** Registre a nova variável semântica no CSS global (`src/index.css`) e utilize a classe utilitária semântica gerada.

### 3.3 Proibição de Restyle Arbitrário em Componentes Base
- Não aplique classes de dimensão (`w-*`, `h-*`, `p-*`, `bg-*`) que descaracterizem o componente base `Button`. Use as variantes (`size="sm"`, `size="lg"`, `variant="outline"`).
- Se precisar de um botão com layout totalmente diferente, componha através de um wrapper de feature dedicado.

---

## 4. Referências e Registries Recomendados

- [Shadcn UI Registry Documentation](https://ui.shadcn.com/docs/registry)
- [Shadcn Official Component Directory](https://ui.shadcn.com/docs/components)
- [Aceternity UI Components](https://ui.aceternity.com/components)
- [Aceternity UI Tooltip Card Source](https://ui.aceternity.com/components/tooltip-card)
- [Base UI Components & Primitives](https://base-ui.com/)
- [Magic UI (React Motion & Tailwind)](https://magicui.design/)
- [21st.dev Design System Registry](https://21st.dev/)
