# Referência: Governança de Estado Assíncrono com TanStack Query v5

Este guia define as práticas canônicas para data fetching, sincronização de estado remoto, mutações e prevenção de condições de corrida com `@tanstack/react-query` v5.

---

## 1. Princípios Fundamentais

1. **Separação Estrita de Papéis:**
   - Hooks de leitura são sufixados com `*Query` (ex: `useSuggestionsCatalogQuery`).
   - Hooks de escrita/mutação são sufixados com `*Mutation` (ex: `useUpdateProviderMutation`).
   - Nunca misture queries e mutations dentro do mesmo hook customizado.
2. **Query Key Factories (Hierárquicas e Seguras):**
   - Query keys devem ser arrays serializáveis imutáveis definidos em factories centralizadas com `as const`:

```typescript
// features/chat/queries/chatQueryKeys.ts
export const chatKeys = {
  all: ['chat'] as const,
  threads: () => [...chatKeys.all, 'threads'] as const,
  threadDetail: (threadId: string) => [...chatKeys.threads(), threadId] as const,
  messages: (threadId: string) => [...chatKeys.threadDetail(threadId), 'messages'] as const,
}
```

---

## 2. Padrão `queryOptions` (Type-Safe & Reutilizável)

Em vez de repetir `queryKey` e `queryFn` em múltiplos locais, use a função utilitária `queryOptions` do TanStack Query:

```typescript
// features/settings/queries/settingsQueries.ts
import { queryOptions } from '@tanstack/react-query'
import { fetchProviderConfig } from '@/features/settings/api/settingsApi'

export const providerConfigQueryOptions = () =>
  queryOptions({
    queryKey: ['settings', 'provider'] as const,
    queryFn: async ({ signal }) => {
      // Repasse o AbortSignal para cancelar a requisição se o componente for desmontado
      return fetchProviderConfig({ signal })
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
  })
```

Consumo no componente ou hook:

```tsx
import { useQuery } from '@tanstack/react-query'
import { providerConfigQueryOptions } from './settingsQueries'

export function useProviderConfigQuery() {
  return useQuery(providerConfigQueryOptions())
}
```

---

## 3. Cancelamento Automático com `signal`

Sempre consuma o `signal` fornecido no `QueryFunctionContext` e repasse para o `fetch` ou `ky`/`axios`:

```typescript
queryFn: async ({ signal }) => {
  const response = await fetch('/api/analytics/schema', { signal })
  if (!response.ok) {
    throw new Error('Falha ao carregar metadados do Lakehouse')
  }
  return response.json()
}
```

Isso garante que se o usuário mudar de aba, navegar para outra tela ou digitar rapidamente em um campo de busca, requisições obsoletas sejam canceladas pelo navegador no nível de TCP/HTTP.

---

## 4. Mutações e Fencing de Ações Assíncronas

### 4.1 Fencing contra Condições de Corrida
- Toda ação de mutação (submeter formulário, disparar stream, deletar conversa) deve conter barreira visual imediata:
  - Botões desabilitados durante execução: `disabled={mutation.isPending}`.
  - Indicador de carregamento no botão (`<Spinner />`).

### 4.2 A Armadilha de Desmontagem Prematura (`key={...}`)
- **Nunca use `key={dynamicRemoteState}`** em nós pais que são desmontados antes do callback de feedback (`onSuccess`) ou antes do toast concluir.
- Mantenha chaves de componente estáveis para preservar a árvore de transição visual do React.

### 4.3 Invalidação Inteligente de Cache
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chatKeys } from './chatQueryKeys'

export function useDeleteThreadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (threadId: string) => deleteThreadApi(threadId),
    onSuccess: (_, deletedId) => {
      // Remove do cache e revalida a lista de threads
      queryClient.invalidateQueries({ queryKey: chatKeys.threads() })
    },
  })
}
```

---

## 5. Referências e Leituras Oficiais

- [TanStack Query v5 React Overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- [TanStack Query Options Guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
- [TkDodo's Practical React Query Blog (Referência canônica de Query Keys e Mutations)](https://tkdodo.eu/blog/practical-react-query)
- [TkDodo: Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)
- [TanStack Query Network Mode and AbortSignal](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
