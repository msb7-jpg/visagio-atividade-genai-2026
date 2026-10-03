import { chatQueryKeys, fetchThreadDetail } from '@/features/chat/api/threadsApi'
import type { ThreadDetail } from '@/features/chat/types/chat.types'
import { useQuery } from '@tanstack/react-query'

export function useThreadDetailQuery(threadId: string | null | undefined) {
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
    gcTime: 1000 * 60 * 30
  })
}
