import type { ProviderType } from '@/features/settings/schemas/settings.schema'
import type { TestProviderResponse } from '@/features/settings/types/settings.types'
import { useTestProviderProbeMutation } from './useTestProviderProbeMutation'

/**
 * Propriedades de entrada para o hook useProviderProbe.
 */
export interface UseProviderProbeProps {
  /** Provedor sendo testado ('groq', 'local', 'openrouter', 'google'). */
  provider: ProviderType
  /** Modelo de LLM informado no formulário. */
  model: string
  /** Chave de API secreta informada. */
  apiKey: string
  /** URL base do provedor. */
  baseUrl: string
  /** Callback opcional notificado com os modelos descobertos na sondagem. */
  onModelsDiscovered?: (models: string[]) => void
}

/**
 * Objeto de retorno do hook useProviderProbe com status de conectividade e ações de teste.
 */
export interface UseProviderProbeResult {
  /** Executa a sondagem de conectividade com as credenciais informadas. */
  handleTestConnection: () => Promise<void>
  /** Resposta de teste retornada pelo backend ou indefinida se ainda não testada. */
  testResult: TestProviderResponse | undefined
  /** Flag indicando se o teste de conexão está em andamento. */
  isTesting: boolean
  /** Flag indicando se a conexão foi validada com sucesso. */
  isConnected: boolean
  /** Flag indicando falha de comunicação ou rejeição de autenticação. */
  isFailed: boolean
  /** Mensagem amigável de erro de conexão. */
  probeErrorMessage: string | null
  /** Estado semântico visual derivado para o input ('default', 'success', 'error'). */
  inputStatus: 'default' | 'success' | 'error'
  /** Limpa o resultado anterior do teste. */
  resetTest: () => void
}

/**
 * Hook para orquestrar o teste de conectividade e health check com provedores de LLM.
 *
 * @param props - Propriedades contendo o provedor, modelo, credenciais e callbacks.
 * @returns Objeto com a função disparadora do teste, status de conexão e mensagens de retorno.
 */
export function useProviderProbe({
  provider,
  model,
  apiKey,
  baseUrl,
  onModelsDiscovered
}: UseProviderProbeProps): UseProviderProbeResult {
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

  let inputStatus: 'default' | 'success' | 'error' = 'default'
  if (isConnected) {
    inputStatus = 'success'
  } else if (isFailed) {
    inputStatus = 'error'
  }

  return {
    handleTestConnection,
    testResult,
    isTesting,
    isConnected,
    isFailed,
    probeErrorMessage,
    inputStatus,
    resetTest
  }
}
