import { chatQueryKeys, deleteThreadApi, fetchThreads } from '@/features/chat/api/threadsApi'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useThreadHistory() {
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
    refetch: threadsQuery.refetch,
    deleteThread: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    updateThreadTitleInCache
  }
}
