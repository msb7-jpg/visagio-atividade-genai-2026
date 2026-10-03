import { useTestProviderProbeMutation } from './useTestProviderProbeMutation'
import type { ProviderType } from '../schemas/settings.schema'

export interface UseProviderProbeProps {
  provider: ProviderType
  model: string
  apiKey: string
  baseUrl: string
  onModelsDiscovered?: (models: string[]) => void
}

export function useProviderProbe({
  provider,
  model,
  apiKey,
  baseUrl,
  onModelsDiscovered
}: UseProviderProbeProps) {
  const { testProvider, testResult, isTesting, testError, resetTest } =
    useTestProviderProbeMutation()

  const handleTestConnection = async () => {
    try {
      const response = await testProvider({
        provider,
        model: model || null,
        api_key: apiKey || null,
        base_url: baseUrl || null,
        timeout_seconds: 10
      })

      if (response?.available_models && response.available_models.length > 0) {
        onModelsDiscovered?.(response.available_models)
      }
    } catch {
      // testError já é refletido pelo react-query
    }
  }

  const isConnected = testResult?.success === true
  const isFailed = testResult?.success === false || Boolean(testError)
  const probeErrorMessage = testResult?.message || testError?.message || null

  const inputStatus: 'default' | 'success' | 'error' = isConnected
    ? 'success'
    : isFailed
      ? 'error'
      : 'default'

  return {
    handleTestConnection,
    testResult,
    isTesting,
    isConnected,
    isFailed,
    inputStatus,
    probeErrorMessage,
    resetTest
  }
}
