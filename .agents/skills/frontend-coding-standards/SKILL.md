---
name: frontend-coding-standards
description: Diretrizes e padrões arquiteturais para frontend moderno em React 19 e TypeScript: arquitetura de slices, anti-god components e anti-god hooks, decomposição headless, early returns e fluxo JSX plano, prevenção de cascading renders, fencing de ações assíncronas e governança do TanStack Query. Use ao arquitetar, refatorar ou implementar componentes, hooks, formulários e fluxos de estado no frontend.
---

# Padrões Arquiteturais e Boas Práticas de Frontend (React 19 & TypeScript)

Este documento estabelece as diretrizes canônicas e independentes de domínio para a criação e manutenção de interfaces de usuário escaláveis, resilientes e performáticas.

## 1. Arquitetura Orientada a Features (Vertical Slices)

### 1.1 Organização Semântica de Diretórios
- Abandone a estrutura horizontal clássica (`components/`, `hooks/`, `utils/` globais). O código deve ser organizado em fatias orientadas a negócio/funcionalidade (`features/<nome-da-slice>/`).
- Evite pastas planas e abarrotadas (ex: um único `components/` com 50 arquivos misturados). Subdivida semanticamente de acordo com o papel na UI:
  - `feed/`, `layout/`, `forms/`, `renderers/`, `modals/`, etc.
- **Single Source of Truth (SSOT) para Tipos:** Não re-exporte tipos que pertencem a outros domínios. Um módulo só exporta o que ele mesmo produz.
- **Sem Barrel Files (`index.ts`):** É proibido o uso de arquivos `index.ts` que apenas agregam exportações. Eles causam ciclos de dependência invisíveis e incham o bundle (o empacotador importa todo o módulo mesmo que você use apenas uma constante).

### 1.2 Co-localização de Testes
- Os testes unitários ou de integração devem residir na mesma subpasta do código sob teste, sob o diretório `__tests__/`. Não mantenha espelhos da estrutura inteira do projeto em uma pasta remota `tests/` global.

---

## 2. Diretriz Anti-God Components e Anti-God Hooks

### 2.1 Proibição de God Components
- Um componente não deve acumular responsabilidades de roteamento, requisições de rede, lógica de validação de formulários densa, múltiplas janelas modais e estilização inline ao mesmo tempo.
- Se um componente passar de 150-200 linhas de densidade lógica, ele deve ser imediatamente decomposto em subcomponentes menores ou ter sua lógica de negócios extraída.

### 2.2 Proibição de God Hooks e Decomposição Headless
- Hooks customizados que retornam 15 a 20 propriedades misturando ciclo de vida, chamadas de API, mutações e variáveis de controle visual violam o SRP (Single Responsibility Principle).
- **Injeção de Dependência em Hooks:** Crie hooks granulares e especialistas (ex: `useUserQuery`, `useSubmitMutation`). Se eles precisarem se comunicar, passe valores por argumentos em vez de criar um mega-hook acoplado.
- Padrão **Headless Hook:** Mantenha a lógica de controle de estado (`useMeuFormularioController`) separada do JSX (a visualização). O componente visual consome o hook, mantendo a responsabilidade pura de renderização.

---

## 3. Boas Práticas de Controle de Fluxo e Renderização JSX Plana

### 3.1 Early Returns (Guard Clauses)
- Retorne estados de `isLoading`, ausência de dados (`!data`) e erros (`isError`) antes de abrir o bloco JSX principal. Isso elimina a necessidade de envolver todo o template em chaves e condicionais gigantes.

```tsx
// ✅ BOM: JSX principal livre de indentação desnecessária
function Dashboard({ user, isLoading }: Props) {
  if (isLoading) return <Skeleton />;
  if (!user) return <LoginPrompt />;
  
  return <MainContent user={user} />;
}
```

### 3.2 Eliminação de Ternários Aninhados e a Armadilha do Falsy `0`
- NUNCA aninhe operadores ternários (`a ? (b ? c : d) : e`).
- **Lookup Mappings:** Para renderizar 3 ou mais estados mutuamente exclusivos, use um mapeamento de dicionário explícito:
```tsx
// ✅ BOM: Extremamente legível e extensível
const views: Record<State, React.ReactNode> = {
  idle: <ReadyState />,
  loading: <Spinner />,
  error: <ErrorBanner />,
  success: <ResultsView />,
};
return views[status] ?? <UnknownState />;
```
- **A Armadilha do Falsy `0`:** No React, usar `&&` com números (como `count && <Badge />`) vazará o dígito `0` na tela quando falso. Exija sempre expressões booleanas estritas (`count > 0 && <Badge />` ou `Boolean(count) &&`).

---

## 4. React 19, Regras de Hooks e Performance

### 4.1 "You Might Not Need an Effect" (Cascading Renders)
- NUNCA declare um `useEffect` para recalcular dados e então chamar `setState` com o resultado baseado na mudança de `props` ou de outras variáveis reativas.
- Calcule dados derivados sincronamente durante a renderização (utilizando varíaveis puras ou `useMemo` se o cálculo for oneroso). Efeitos para sincronizar estados causam renderizações em cascata que congelam a interface e violam o compilador do React.

### 4.2 Disciplina no Uso de `useCallback`
- `useCallback` adiciona sobrecarga de alocação de memória e comparação superficial de dependências a cada renderização.
- Use-o APENAS se a função for repassada a um componente memorizado explicitamente (`React.memo`) ou se a função for consumida pelo array de dependências (`exhaustive-deps`) de outro hook que precisa de estabilidade referencial.
- Evite criar "wrappers" de callbacks defensivos para elementos nativos (`<button onClick={...}>`).

### 4.3 Reutilização de Código e Utilitários com `@reactuse/core`
- **Buscar sempre oportunidades de reutilização:** Antes de criar hooks manuais ou escrever soluções ad-hoc para comportamentos comuns de ciclo de vida, eventos de browser ou sincronização de estado, verifique utilitários consolidados.
- **Uso de `@reactuse/core` (moderno):** Dê preferência a [`@reactuse/core`](https://reactuse.org/) para lidar com padrões recorrentes.
  - ⚠️ **Atenção:** NÃO confunda com o pacote legado e descontinuado `react-use`. O padrão oficial a ser adotado é `@reactuse/core`.
- **Casos comuns para substituir `useEffect` e boilerplate manual:**
  - **Ciclo de vida e montagem:** `useMounted`, `useIsMounted`, `useUnmount`, `useMount`.
  - **Timers e assincronia:** `useTimeout`, `useTimeoutFn`, `useInterval`, `useDebounceFn`, `useThrottleFn` (evitando boilerplate de `clearTimeout`/`clearInterval` e refs manuais dentro de `useEffect`).
  - **Sensores e Browser APIs:** `useWindowSize`, `useEventListener`, `useIntersectionObserver`, `useResizeObserver`, `useOnClickOutside`.
  - **Estado e Refs:** `usePrevious`, `useToggle`, `useLatest`.
- **Regra de ouro:** Se uma necessidade de ciclo de vida, timer ou evento puder ser expressa com um hook pronto e testado de `@reactuse/core`, evite reinventar a roda criando `useEffect` com cleanup manual boilerplate.

---

## 5. Fencing de Ações Assíncronas e Prevenção de Desmontagem Prematura

### 5.1 Fencing contra Condições de Corrida
- Toda ação crítica do usuário (submissões, requisições de salvar) deve possuir uma barreira (fence) de estado: botões e forms devem ser instantaneamente desabilitados (`disabled={isSubmitting || isClosing}`).

### 5.2 A Armadilha de Desmontagem Prematura (`key={...}`)
- NUNCA atribua uma propriedade `key={dynamicState}` a componentes baseada em dados remotos que podem ser invalidados no meio de uma transição de UI.
- Se o usuário clicar em "Salvar", a query subjacente for invalidada e o novo dado fluir, o React pode destruir o componente antes do timer de feedback (ex: Toast, sucesso) ou do redirecionamento (`onSuccess`) disparar, causando loops não terminados ou modais zumbis. Fixe as keys ou preserve o estado na transição.

---

## 6. Governança de Estado Assíncrono (TanStack Query & Formulários)

### 6.1 Separação Estrita de Queries e Mutations
- Hooks que buscam dados são obrigatoriamente sufixados com `*Query`. Hooks que escrevem ou atualizam dados são sufixados com `*Mutation`. Não junte ambos sob um mesmo hook customizado de serviço.

### 6.2 Uso Correto das Opções de Mutação
- Ao acionar ações secundárias pós-sucesso (fechar modais, exibir notificações de interface, forçar scroll), prefira anexar os callbacks às opções invocadas durante o evento, mantendo a reatividade UI no handler local.
- Utilize o estado reativo natural de erro retornado pelo hook da mutação ao invés de duplicar com `const [erroLocal, setErroLocal] = useState(...)`.

---

## 7. Renderizadores Polimórficos e Composição Limpa

### 7.1 Content Registry vs. Componente Inflado
- Se uma tela ou feed de histórico possui múltiplos formatos estruturais heterogêneos, evite um único componente inflado com dezenas de imports de sub-widgets. Isole a decisão e mapeamento (o Polimorfismo) num `ContentRenderer` limpo e centralizado.

### 7.2 Zero Poluição Visual (Design & Motion)
- **Code-Splitting (`React.lazy`):** Bibliotecas pesadas (destaque de código, visualizadores gráficos densos) devem ser sempre envelopadas em lazy loading para não degradarem a perfomance da primeira pintura da aplicação.
- Animações complexas, físicas de mola (`spring`) ou orquestrações de `AnimatePresence` devem ser isoladas em primitivas declarativas (`<SlideTransition>`, `<FadeIn>`) que englobam o conteúdo limpo de negócio. A lógica de negócio jamais deve se misturar a constantes físicas de interface dentro do mesmo componente.
- **Padrão Oficial de Animação: `motion` (`motion/react`):**
  - O pacote oficial do ecossistema é `motion` (`npm: motion`), importado canonicamente via `import { motion, AnimatePresence } from 'motion/react'`.
  - **Legado Descontinuado:** Não utilize nem importe o pacote `framer-motion`. Ele foi renomeado e tornado independente em 2025 pelo criador, mantendo exatamente o mesmo código sob a marca `motion`. Imports diretos de `framer-motion` violam as dependências declaradas e devem ser bloqueados por linting (`no-restricted-imports`).
