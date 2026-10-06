# Referência: React 19, Disciplina de Hooks e Performance

Este guia reúne as regras de conformidade com o compilador do React 19, eliminação de efeitos desnecessários e boas práticas com `@reactuse/core`.

---

## 1. Regras Fundamentais do React 19

1. **Sem `React.FC` ou `React.FunctionComponent`:**
   Declare componentes como funções JavaScript convencionais com suas props tipadas explicitamente:
   ```tsx
   // ❌ RUIM:
   export const MyCard: React.FC<MyCardProps> = ({ title }) => { ... }

   // ✅ BOM:
   export function MyCard({ title, active = false }: MyCardProps) { ... }
   ```
2. **Sem `forwardRef`:**
   No React 19, `ref` é uma prop nativa de primeiro nível em componentes de função:
   ```tsx
   export function CustomInput({ ref, ...props }: CustomInputProps) {
     return <input ref={ref} {...props} />
   }
   ```
3. **Sem `<Context.Provider>`:**
   Renderize o contexto diretamente como elemento JSX:
   ```tsx
   <ThemeContext value={currentTheme}>
     {children}
   </ThemeContext>
   ```

---

## 2. "You Might Not Need an Effect" (Prevenção de Cascading Renders)

- **Nunca use `useEffect` para sincronizar estados derivados de props:**
  Se um valor pode ser calculado a partir de props ou do estado existente, calcule-o diretamente durante a renderização (usando variáveis puras ou `useMemo` apenas se o cálculo envolver iterações pesadas).
- `useEffect` que executa `setState` causa uma segunda pintura imediata na tela, gera piscadas (*flicker*) e quebra as otimizações do novo compilador do React.

---

## 3. Disciplina no Uso de `useCallback`

- Funções passadas para elementos nativos como `<button onClick={handleClick}>` **não precisam de `useCallback`**. O navegador já lida eficientemente com handlers puros.
- Utilize `useCallback` **apenas** quando:
  1. A função for repassada para um componente com `React.memo` explícito.
  2. A função for consumida pelo array de dependências (`dependencies`) de outro hook que exige estabilidade referencial estrita.

---

## 4. Utilitários Modernos com `@reactuse/core`

Antes de criar um `useEffect` com cleanup manual de timers, listeners de janela ou observers, verifique as primitivas consolidadas do [`@reactuse/core`](https://reactuse.org/):

- **Ciclo de vida:** `useMounted`, `useIsMounted`, `useUnmount`.
- **Timers e Assincronia:** `useTimeoutFn`, `useInterval`, `useDebounceFn`, `useThrottleFn` (eliminam boilerplate de `setTimeout`/`clearTimeout` em refs).
- **Sensores e Browser APIs:** `useWindowSize`, `useEventListener`, `useIntersectionObserver`, `useOnClickOutside`.
- **Estado e Refs:** `usePrevious`, `useToggle`, `useLatest`.

> [!WARNING]
> Nunca instale ou importe a biblioteca legada `react-use`. O pacote mantido e padrão no repositório é `@reactuse/core`.

---

## 5. Referências e Leituras Oficiais

- [React 19 Official Release Announcement](https://react.dev/blog/2024/12/05/react-19)
- [You Might Not Need an Effect (React Official Docs)](https://react.dev/learn/you-might-not-need-an-effect)
- [React Compiler Working Model](https://react.dev/learn/react-compiler)
- [@reactuse/core Documentation](https://reactuse.org/)
