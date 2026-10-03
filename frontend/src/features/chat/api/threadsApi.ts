import { apiClient } from '@/lib/api-client'
import type { ThreadDetail, ThreadSummary } from '@/features/chat/types/chat.types'

export const chatQueryKeys = {
  allThreads: () => ['chat', 'threads'] as const,
  threadDetail: (id: string) => ['chat', 'threads', id] as const
}

export async function fetchThreads(limit = 50, offset = 0): Promise<ThreadSummary[]> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  })
  return apiClient<ThreadSummary[]>(`/chat/threads?${query.toString()}`)
}

export async function fetchThreadDetail(threadId: string): Promise<ThreadDetail> {
  return apiClient<ThreadDetail>(`/chat/threads/${threadId}`)
}

export async function deleteThreadApi(threadId: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/chat/threads/${threadId}`, {
    method: 'DELETE'
  })
}
