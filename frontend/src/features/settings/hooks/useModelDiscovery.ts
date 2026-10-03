import { useState } from 'react'

export function useModelDiscovery(onModelSelect?: (model: string) => void) {
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
