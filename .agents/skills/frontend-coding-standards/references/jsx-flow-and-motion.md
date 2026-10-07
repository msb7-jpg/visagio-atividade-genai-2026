# Reference: JSX Flow Control, Early Returns, and Animations with Motion

This guide covers writing clean, flat JSX trees and creating declarative transitions with spring physics using `motion/react`.

---

## 1. Early Returns (Guard Clauses) vs. JSX Nesting

Avoid wrapping entire JSX trees in massive conditionals. Handle loading states, missing data, and errors prior to the primary return:

```tsx
// ❌ BAD: Pyramid of braces and ternaries in JSX
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

// ✅ GOOD: Flat flow, testable, without excessive indentation
function UserProfile({ user, isLoading, isError }: Props) {
  if (isLoading) return <Spinner />
  if (isError) return <ErrorAlert />
  if (!user) return <EmptyState />

  return <ProfileCard user={user} />
}
```

---

## 2. Eliminating Nested Ternaries and the Falsy `0` Pitfall

### 2.1 Lookup Mappings
To switch between 3 or more mutually exclusive visual states, use a simple component dictionary:

```tsx
const viewStates: Record<State, React.ReactNode> = {
  idle: <CatalogReady />,
  loading: <CatalogSkeleton />,
  error: <CatalogError />,
  empty: <CatalogEmpty />,
}

return viewStates[currentState] ?? null
```

### 2.2 The Falsy `0` Pitfall in React
- Using `&&` with numbers (e.g., `items.length && <Badge />`) renders the number `0` as text on screen when the array is empty.
- **Rule:** Always use strict boolean comparisons:
  - `items.length > 0 && <Badge />`
  - `Boolean(items.length) && <Badge />`

---

## 3. Official Animation Standard: `motion` (`motion/react`)

1. **Official Package:**
   - The project uses the unified `motion` library (`npm: motion`).
   - The required import is:
     ```tsx
     import { motion, AnimatePresence } from 'motion/react'
     ```
   - ❌ **Prohibited:** `from 'framer-motion'` (legacy and deprecated package).
2. **Declarative Transition Encapsulation:**
   - Isolate physics constants and animation properties inside reusable primitives (`src/components/animations/`):
     - `<DirectionalSlide />`
     - `<FloatingItem />`
     - `<SlidingIndicator />`
     - `<StaggerList />`
   - Business logic code should not clutter presentational components with hundreds of lines of manual `initial`, `animate`, and `transition` props.

---

## 4. Official References and Further Reading

- [Motion (formerly Framer Motion) Official Quick Start](https://motion.dev/docs/react-quick-start)
- [Motion AnimatePresence Guide](https://motion.dev/docs/react-animate-presence)
- [React Conditional Rendering Best Practices](https://react.dev/learn/conditional-rendering)
