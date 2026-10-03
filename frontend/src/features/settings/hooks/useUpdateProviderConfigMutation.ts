import { settingsQueryKeys } from '@/features/settings/constants/settingsQueryKeys'
import type { ProviderConfig } from '@/features/settings/types/settings.types'
import { apiClient } from '@/lib/api-client'
import { useMutation, type UseMutateAsyncFunction, type UseMutateFunction } from '@tanstack/react-query'

/**
 * Objeto de retorno do hook useUpdateProviderConfigMutation com funções de salvamento e status.
 */
export interface UseUpdateProviderConfigMutationResult {
  /** Dispara a mutação de salvamento de configurações. */
  updateConfig: UseMutateFunction<ProviderConfig, Error, ProviderConfig, unknown>
  /** Dispara a mutação de salvamento de forma assíncrona retornando uma promessa. */
  updateConfigAsync: UseMutateAsyncFunction<ProviderConfig, Error, ProviderConfig, unknown>
  /** Flag indicando persistência em andamento. */
  isUpdating: boolean
  /** Erro de requisição retornado pelo backend caso o salvamento falhe. */
  updateError: Error | null
  /** Flag indicando que a mutação foi concluída com sucesso. */
  isSuccess: boolean
  /** Limpa o estado da mutação. */
  resetUpdate: () => void
}

/**
 * Hook do TanStack Query para salvar e persistir a configuração ativa de provedores no backend.
 *
 * @returns Objeto com métodos disparadores da mutação e estados de loading/sucesso.
 */
export function useUpdateProviderConfigMutation(): UseUpdateProviderConfigMutationResult {
  const mutation = useMutation<ProviderConfig, Error, ProviderConfig>({
    mutationFn: (newConfig: ProviderConfig) =>
      apiClient<ProviderConfig>('/settings/provider', {
        method: 'POST',
        body: newConfig
      }),
    meta: {
      invalidates: [settingsQueryKeys.provider()]
    }
  })

  return {
    updateConfig: mutation.mutate,
    updateConfigAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
    isSuccess: mutation.isSuccess,
    resetUpdate: mutation.reset
  }
}
