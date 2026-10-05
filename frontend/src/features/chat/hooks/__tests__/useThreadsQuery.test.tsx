import { useThreadsQuery } from '@/features/chat/hooks/useThreadsQuery'
import * as apiClientModule from '@/lib/api-client'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

describe('useThreadsQuery Hook', () => {
  it('retorna a lista de threads após consulta bem-sucedida', async () => {
    const mockThreads: ThreadSummary[] = [
      {
        thread_id: 't-1',
        title: 'Análise de Bilheteria',
        created_at: 1700000000,
        updated_at: 1700000500
      }
    ]

    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValue(mockThreads)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useThreadsQuery(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockThreads)
  })
})
