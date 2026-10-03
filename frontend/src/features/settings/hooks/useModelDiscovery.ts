import { useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Objeto de retorno do hook useModelDiscovery para gerenciar catálogo descoberto de modelos.
 */
export interface UseModelDiscoveryResult {
  /** Lista de identificadores de modelos retornados dinamicamente pelo teste de conectividade. */
  discoveredModels: string[]
  /** Se `true`, habilita o input livre de texto para digitação manual de modelo não listado. */
  isCustomModel: boolean
  /** Alterna o modo de modelo customizado. */
  setIsCustomModel: Dispatch<SetStateAction<boolean>>
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
  const [isCustomModel, setIsCustomModel] = useState(false)

  const handleModelsDiscovered = (models: string[]) => {
    setDiscoveredModels(models)
    if (models.length > 0) {
      onModelSelect?.(models[0])
    }
  }

  const resetDiscovery = () => {
    setDiscoveredModels([])
    setIsCustomModel(false)
  }

  return {
    discoveredModels,
    isCustomModel,
    setIsCustomModel,
    handleModelsDiscovered,
    resetDiscovery
  }
}
