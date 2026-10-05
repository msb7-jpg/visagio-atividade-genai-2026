import { chatQueryKeys } from '@/features/chat/api/threadsApi'
import { useDeleteThreadMutation } from '@/features/chat/hooks/useDeleteThreadMutation'
import * as apiClientModule from '@/lib/api-client'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

describe('useDeleteThreadMutation Hook', () => {
  it('aplica atualização otimista removendo a thread do cache e revalida ao finalizar', async () => {
    const initialThreads: ThreadSummary[] = [
      {
        thread_id: 't-1',
        title: 'Thread 1',
        created_at: 1700000000,
        updated_at: 1700000500
      },
      {
        thread_id: 't-2',
        title: 'Thread 2',
        created_at: 1700001000,
        updated_at: 1700001500
      }
    ]

    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue({ success: true })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
    queryClient.setQueryData(chatQueryKeys.allThreads(), initialThreads)

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeleteThreadMutation(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('t-1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData<ThreadSummary[]>(chatQueryKeys.allThreads())
    expect(cached?.some((thread) => thread.thread_id === 't-1')).toBe(false)
  })
})
