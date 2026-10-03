import { chatQueryKeys, deleteThreadApi, fetchThreads } from '@/features/chat/api/threadsApi'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Objeto de retorno do hook de histórico de conversas com listagem e mutação otimista de exclusão.
 */
export interface UseThreadHistoryResult {
  /** Lista ordenada de conversas salvas no SQLite. */
  threads: ThreadSummary[]
  /** Indica se a consulta inicial de threads está em carregamento. */
  isLoading: boolean
  /** Indica se ocorreu erro ao carregar as threads. */
  isError: boolean
  /** Dispara a exclusão de uma conversa com atualização otimista da lista. */
  deleteThread: (threadId: string) => void
  /** Flag indicando que uma operação de exclusão está em execução. */
  isDeleting: boolean
  /** Atualiza diretamente o título de uma thread no cache do TanStack Query sem refetch imediato. */
  updateThreadTitleInCache: (threadId: string, newTitle: string) => void
}

/**
 * Hook para gerenciamento do catálogo de conversas com cache TanStack Query e exclusão otimista.
 *
 * @returns Objeto com lista de threads, flags de carregamento e métodos de manipulação de cache.
 */
export function useThreadHistory(): UseThreadHistoryResult {
  const queryClient = useQueryClient()

  const threadsQuery = useQuery({
    queryKey: chatQueryKeys.allThreads(),
    queryFn: () => fetchThreads()
  })

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => deleteThreadApi(threadId),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.allThreads() })
      const previousThreads = queryClient.getQueryData<ThreadSummary[]>(chatQueryKeys.allThreads())

      if (previousThreads) {
        queryClient.setQueryData<ThreadSummary[]>(
          chatQueryKeys.allThreads(),
          previousThreads.filter((thread) => thread.thread_id !== deletedId)
        )
      }

      return { previousThreads }
    },
    onError: (_err, _id, context) => {
      if (context?.previousThreads) {
        queryClient.setQueryData(chatQueryKeys.allThreads(), context.previousThreads)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
    }
  })

  const updateThreadTitleInCache = (threadId: string, newTitle: string) => {
    queryClient.setQueryData<ThreadSummary[]>(chatQueryKeys.allThreads(), (old) => {
      if (!old) return old
      return old.map((thread) =>
        thread.thread_id === threadId ? { ...thread, title: newTitle, updated_at: Date.now() / 1000 } : thread
      )
    })
  }

  return {
    threads: threadsQuery.data ?? [],
    isLoading: threadsQuery.isLoading,
    isError: threadsQuery.isError,
    deleteThread: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    updateThreadTitleInCache
  }
}
