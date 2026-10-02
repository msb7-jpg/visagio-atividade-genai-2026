import { settingsQueryKeys } from '@/features/settings/constants/settingsQueryKeys'
import type { ProviderConfig } from '@/features/settings/types/settings.types'
import { apiClient } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

export function useProviderConfigQuery() {
  const query = useQuery<ProviderConfig>({
    queryKey: settingsQueryKeys.provider(),
    queryFn: () => apiClient<ProviderConfig>('/settings/provider')
  })

  return {
    config: query.data,
    isLoading: query.isLoading
  }
}
