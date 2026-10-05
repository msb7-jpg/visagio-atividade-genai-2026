import { chatQueryKeys, deleteThreadApi } from '@/features/chat/api/threadsApi'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'

/**
 * Contexto de snapshot para rollback otimista na exclusão de threads.
 */
export interface DeleteThreadMutationContext {
  /** Snapshot das threads antes da mutação para rollback. */
  previousThreads?: ThreadSummary[]
}

/**
 * Hook de mutação para exclusão otimista de conversas no servidor com rollback automático em caso de falha.
 *
 * @returns Objeto de mutação do TanStack Query com mutate, mutateAsync e estado reativo isPending.
 */
export function useDeleteThreadMutation(): UseMutationResult<
  { success: boolean },
  Error,
  string,
  DeleteThreadMutationContext
> {
  const queryClient = useQueryClient()

  return useMutation({
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
}
