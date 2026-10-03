import type { TestProviderRequest, TestProviderResponse } from '@/features/settings/types/settings.types'
import { apiClient } from '@/lib/api-client'
import { useMutation } from '@tanstack/react-query'

/**
 * Objeto de retorno do hook useTestProviderProbeMutation com métodos de probe e resultados.
 */
export interface UseTestProviderProbeMutationResult {
  /** Dispara a verificação assíncrona de conectividade com o provedor. */
  testProvider: (requestData: TestProviderRequest) => Promise<TestProviderResponse>
  /** Resposta estruturada retornada pelo endpoint de teste (/settings/test-provider). */
  testResult: TestProviderResponse | undefined
  /** Flag indicando se o teste de ping/descoberta está em andamento. */
  isTesting: boolean
  /** Erro de requisição retornado pelo cliente HTTP, se houver. */
  testError: Error | null
  /** Limpa o resultado anterior do teste. */
  resetTest: () => void
}

/**
 * Hook do TanStack Query para disparo de teste de conectividade e health check de provedores LLM.
 *
 * @returns Objeto com a função disparadora da mutação, resultados e estados de carregamento.
 */
export function useTestProviderProbeMutation(): UseTestProviderProbeMutationResult {
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
