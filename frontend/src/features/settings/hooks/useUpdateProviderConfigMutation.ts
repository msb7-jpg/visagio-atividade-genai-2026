import { settingsQueryKeys } from '@/features/settings/constants/settingsQueryKeys'
import type { ProviderConfig } from '@/features/settings/types/settings.types'
import { apiClient } from '@/lib/api-client'
import { useMutation } from '@tanstack/react-query'

export function useUpdateProviderConfigMutation() {
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
