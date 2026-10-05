import { threadDetailQueryOptions } from '@/features/chat/api/threadsApi'
import type { ThreadDetail } from '@/features/chat/types/chat.types'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

/**
 * Hook do TanStack Query para carregar os detalhes e checkpoints históricos de uma thread.
 *
 * @param threadId - Identificador único da conversa no SQLite.
 * @returns Objeto de resultado da query do TanStack com estado de loading, erros e dados da thread.
 */
export function useThreadDetailQuery(threadId: string | null | undefined): UseQueryResult<ThreadDetail, Error> {
  return useQuery(threadDetailQueryOptions(threadId))
}
