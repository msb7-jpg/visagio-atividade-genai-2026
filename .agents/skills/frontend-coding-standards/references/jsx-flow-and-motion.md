# Referência: Controle de Fluxo JSX, Early Returns e Animações com Motion

Este guia orienta a escrita de árvores JSX limpas, planas e a criação de transições declarativas com física de mola usando `motion/react`.

---

## 1. Early Returns (Guard Clauses) vs. Aninhamento JSX

Evite envolver todo o JSX em condicionais gigantes. Trate estados de carregamento, ausência de dados e erros antes do retorno principal:

```tsx
// ❌ RUIM: Pirâmide de chaves e ternários no JSX
function UserProfile({ user, isLoading, isError }: Props) {
  return (
    <div>
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorAlert />
      ) : user ? (
        <ProfileCard user={user} />
      ) : null}
    </div>
  )
}

// ✅ BOM: Fluxo plano, testável e sem indentação excessiva
function UserProfile({ user, isLoading, isError }: Props) {
  if (isLoading) return <Spinner />
  if (isError) return <ErrorAlert />
  if (!user) return <EmptyState />

  return <ProfileCard user={user} />
}
```

---

## 2. Eliminação de Ternários Aninhados e a Armadilha do `0` Falsy

### 2.1 Lookup Mappings
Para alternar entre 3 ou mais estados visuais mutuamente exclusivos, utilize um dicionário simples de componentes:

```tsx
const viewStates: Record<State, React.ReactNode> = {
  idle: <CatalogReady />,
  loading: <CatalogSkeleton />,
  error: <CatalogError />,
  empty: <CatalogEmpty />,
}

return viewStates[currentState] ?? null
```

### 2.2 A Armadilha do `0` Falsy no React
- Usar `&&` com números (ex: `items.length && <Badge />`) renderiza o número `0` como texto na tela quando o array estiver vazio.
- **Regra:** Utilize sempre comparações booleanas estritas:
  - `items.length > 0 && <Badge />`
  - `Boolean(items.length) && <Badge />`

---

## 3. Padrão Oficial de Animação: `motion` (`motion/react`)

1. **Pacote Oficial:**
   - O projeto utiliza a biblioteca unificada `motion` (`npm: motion`).
   - O import obrigatório é:
     ```tsx
     import { motion, AnimatePresence } from 'motion/react'
     ```
   - ❌ **Proibido:** `from 'framer-motion'` (pacote legado e descontinuado).
2. **Encapsulamento Declarativo de Transições:**
   - Isole constantes físicas e propriedades de animação em primitivas reutilizáveis (`src/components/animations/`):
     - `<DirectionalSlide />`
     - `<FloatingItem />`
     - `<SlidingIndicator />`
     - `<StaggerList />`
   - O código de negócio não deve poluir componentes de apresentação com centenas de linhas de propriedades `initial`, `animate` e `transition` manuais.

---

## 4. Referências e Leituras Oficiais

- [Motion (formerly Framer Motion) Official Quick Start](https://motion.dev/docs/react-quick-start)
- [Motion AnimatePresence Guide](https://motion.dev/docs/react-animate-presence)
- [React Conditional Rendering Best Practices](https://react.dev/learn/conditional-rendering)
