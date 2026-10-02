import type { TestProviderRequest, TestProviderResponse } from '@/features/settings/types/settings.types'
import { apiClient } from '@/lib/api-client'
import { useMutation } from '@tanstack/react-query'

export function useTestProviderProbeMutation() {
  const mutation = useMutation<TestProviderResponse, Error, TestProviderRequest>({
    mutationFn: (requestData: TestProviderRequest) =>
      apiClient<TestProviderResponse>('/settings/test-provider', {
        method: 'POST',
        body: requestData
      })
  })

  return {
    testProvider: mutation.mutateAsync,
    testResult: mutation.data,
    isTesting: mutation.isPending,
    testError: mutation.error,
    resetTest: mutation.reset
  }
}
