import type { ThreadDetail, ThreadSummary } from '@/features/chat/types/chat.types'
import { apiClient } from '@/lib/api-client'

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
export async function fetchThreads(limit = 50, offset = 0): Promise<ThreadSummary[]> {
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
export async function fetchThreadDetail(threadId: string): Promise<ThreadDetail> {
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
