import { settingsQueryKeys } from '@/features/settings/constants/settingsQueryKeys'
import type { ProviderConfig } from '@/features/settings/types/settings.types'
import { apiClient } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

/**
 * Objeto de retorno do hook useProviderConfigQuery contendo os dados de configuração ativa de LLM.
 */
export interface UseProviderConfigQueryResult {
  /** Configuração ativa e lista de provedores salvos no SQLite ou indefinido se ainda não carregado. */
  config: ProviderConfig | undefined
  /** Flag indicando se a busca inicial das configurações está em andamento. */
  isLoading: boolean
}

/**
 * Hook para consulta reativa da configuração de LLM ativa no backend (/settings/provider).
 *
 * @returns Objeto com a configuração de provedor ativa e estado de carregamento.
 */
export function useProviderConfigQuery(): UseProviderConfigQueryResult {
  const query = useQuery<ProviderConfig>({
    queryKey: settingsQueryKeys.provider(),
    queryFn: () => apiClient<ProviderConfig>('/settings/provider')
  })

  return {
    config: query.data,
    isLoading: query.isLoading
  }
}
