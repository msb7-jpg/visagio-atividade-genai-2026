import { chatQueryKeys, fetchThreadDetail } from '@/features/chat/api/threadsApi'
import type { ThreadDetail } from '@/features/chat/types/chat.types'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

/**
 * Hook do TanStack Query para carregar os detalhes e checkpoints históricos de uma thread.
 *
 * @param threadId - Identificador único da conversa no SQLite.
 * @returns Objeto de resultado da query do TanStack com estado de loading, erros e dados da thread.
 */
export function useThreadDetailQuery(threadId: string | null | undefined): UseQueryResult<ThreadDetail, Error> {
  return useQuery<ThreadDetail, Error>({
    queryKey: threadId ? chatQueryKeys.threadDetail(threadId) : ['chat', 'threads', 'empty'],
    queryFn: () => {
      if (!threadId) {
        throw new Error('ID da thread inválido para busca.')
      }
      return fetchThreadDetail(threadId)
    },
    enabled: Boolean(threadId),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
    gcTime: 1000 * 60 * 30,
    // Enquanto o backend ainda processa (ex.: após reload), consulta periodicamente até concluir
    refetchInterval: (query) => (query.state.data?.is_running ? 3000 : false)
  })
}
