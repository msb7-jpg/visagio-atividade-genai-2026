import { useState } from 'react'

/**
 * Objeto de retorno do hook useModelDiscovery para gerenciar catálogo descoberto de modelos.
 */
export interface UseModelDiscoveryResult {
  /** Lista de identificadores de modelos retornados dinamicamente pelo teste de conectividade. */
  discoveredModels: string[]
  /** Registra a lista de modelos recém-descoberta e pré-seleciona o primeiro elemento. */
  handleModelsDiscovered: (models: string[]) => void
  /** Limpa os modelos descobertos e reseta o modo de seleção. */
  resetDiscovery: () => void
}

/**
 * Hook para gerenciar os modelos LLM descobertos em tempo de execução via probe da API.
 *
 * @param onModelSelect - Callback opcional executado quando um modelo descoberto for pré-selecionado.
 * @returns Objeto com a lista de modelos, flag de modelo customizado e métodos de atualização.
 */
export function useModelDiscovery(onModelSelect?: (model: string) => void): UseModelDiscoveryResult {
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])

  const handleModelsDiscovered = (models: string[]) => {
    setDiscoveredModels(models)
    if (models.length > 0) {
      onModelSelect?.(models[0])
    }
  }

  const resetDiscovery = () => {
    setDiscoveredModels([])
  }

  return {
    discoveredModels,
    handleModelsDiscovered,
    resetDiscovery
  }
}
