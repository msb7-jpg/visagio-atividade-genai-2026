import type { ThreadDetail, ThreadSummary } from '@/features/chat/types/chat.types'
import { apiClient } from '@/lib/api-client'
import { queryOptions } from '@tanstack/react-query'

/**
 * Chaves de consulta padronizadas para cache no TanStack Query.
 */
export const chatQueryKeys = {
  allThreads: () => ['chat', 'threads'] as const,
  threadDetail: (id: string) => ['chat', 'threads', id] as const
}

/**
 * Consulta a lista paginada de resumos de conversas salvas no SQLite.
 *
 * @param limit - Quantidade máxima de conversas a recuperar por página.
 * @param offset - Posição inicial para paginação.
 * @returns Promessa com a lista de resumos ThreadSummary.
 */
async function fetchThreads(limit = 50, offset = 0): Promise<ThreadSummary[]> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  })
  return apiClient<ThreadSummary[]>(`/chat/threads?${query.toString()}`)
}

/**
 * Recupera o histórico completo de mensagens e checkpoints de uma thread.
 *
 * @param threadId - Identificador único da conversa.
 * @returns Promessa com o detalhe completo da thread ThreadDetail.
 */
async function fetchThreadDetail(threadId: string): Promise<ThreadDetail> {
  return apiClient<ThreadDetail>(`/chat/threads/${threadId}`)
}

/**
 * Remove uma conversa e seu histórico associado no servidor.
 *
 * @param threadId - Identificador da conversa a ser excluída.
 * @returns Objeto indicando o sucesso da remoção.
 */
export async function deleteThreadApi(threadId: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/chat/threads/${threadId}`, {
    method: 'DELETE'
  })
}

/**
 * Opções padronizadas para a consulta de listagem de threads.
 *
 * @param limit - Quantidade máxima de conversas a recuperar.
 * @param offset - Posição inicial para paginação.
 * @returns Objeto queryOptions do TanStack Query.
 */
export const threadsQueryOptions = (limit = 50, offset = 0) =>
  queryOptions({
    queryKey: chatQueryKeys.allThreads(),
    queryFn: () => fetchThreads(limit, offset)
  })

/**
 * Opções padronizadas para a consulta detalhada de uma thread com polling condicional.
 *
 * @param threadId - Identificador único da conversa.
 * @returns Objeto queryOptions do TanStack Query.
 */
export const threadDetailQueryOptions = (threadId: string | null | undefined) =>
  queryOptions({
    queryKey: threadId ? chatQueryKeys.threadDetail(threadId) : ['chat', 'threads', 'empty'],
    queryFn: () => {
      if (!threadId)
        throw new Error('ID da thread inválido para busca.')

      return fetchThreadDetail(threadId)
    },
    enabled: Boolean(threadId),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
    gcTime: 1000 * 60 * 30,
    refetchInterval: (query) => (query.state.data?.is_running ? 3000 : false)
  })
