import {
  ProviderConfigFormSchema,
  type ProviderConfig
} from '@/features/settings/schemas/settings.schema'
import { useTimeoutFn } from '@reactuses/core'
import { useForm, useSelector, type FormApi } from '@tanstack/react-form'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { useUpdateProviderConfigMutation } from './useUpdateProviderConfigMutation'

/**
 * Propriedades de entrada para o hook useProviderFormCore.
 */
export interface UseProviderFormCoreProps {
  /** Configuração inicial de provedor vinda da query ou cache. */
  initialConfig: ProviderConfig
  /** Callback opcional executado após o salvamento bem-sucedido. */
  onSuccess?: () => void
  /** Indica se há streaming ativo bloqueando edições concorrentes. */
  isStreaming?: boolean
}

/**
 * Objeto de retorno contendo a instância do formulário TanStack e estados derivados.
 */
export interface UseProviderFormCoreResult {
  /** Instância do TanStack Form gerenciando validação e valores. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: FormApi<any, any>
  /** Provedor atualmente selecionado no formulário. */
  selectedProvider: string
  /** Modelo atualmente digitado ou selecionado. */
  currentModel: string
  /** Chave de API atual no input. */
  currentApiKey: string
  /** URL base customizada atual no input. */
  currentBaseUrl: string
  /** Flag indicando que a mutação de salvamento está em andamento. */
  isUpdating: boolean
  /** Flag indicando estado transitório de fechamento pós-salvamento. */
  isClosing: boolean
  /** Erro emitido pelo backend durante o salvamento. */
  updateError: Error | null
  /** Mensagem amigável de sucesso. */
  saveSuccessMessage: string | null
  /** Limpa o estado de erro de salvamento. */
  resetUpdate: () => void
  /** Define diretamente a mensagem de sucesso de salvamento. */
  setSaveSuccessMessage: Dispatch<SetStateAction<string | null>>
}

export type ProviderFormInstance = UseProviderFormCoreResult['form']

/**
 * Hook de controle de formulário TanStack Form para edição e validação de configurações de provedor LLM.
 *
 * @param props - Propriedades contendo configuração inicial e callbacks.
 * @returns Objeto com a instância do formulário, valores observados e estados de submissão.
 */
export function useProviderFormCore({
  initialConfig,
  onSuccess,
  isStreaming
}: UseProviderFormCoreProps): UseProviderFormCoreResult {
  const { updateConfig, isUpdating, updateError, resetUpdate } =
    useUpdateProviderConfigMutation()

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState<boolean>(false)

  const [, startSuccessTimeout] = useTimeoutFn(
    () => {
      onSuccess?.()
    },
    800,
    { immediate: false }
  )

  const form = useForm({
    defaultValues: {
      provider: initialConfig.provider,
      model: initialConfig.model ?? '',
      api_key: initialConfig.api_key ?? '',
      base_url: initialConfig.base_url ?? '',
      timeout_seconds: initialConfig.timeout_seconds ?? 30
    },
    validators: {
      onSubmit: ProviderConfigFormSchema
    },
    onSubmit: ({ value }) => {
      if (isUpdating || isClosing || isStreaming) return

      setSaveSuccessMessage(null)
      resetUpdate()

      updateConfig(
        {
          provider: value.provider,
          model: value.model,
          api_key: value.api_key || null,
          base_url: value.base_url || null,
          timeout_seconds: value.timeout_seconds ?? 30,
          saved_providers: initialConfig.saved_providers ?? [],
          saved_configs: initialConfig.saved_configs ?? {}
        },
        {
          onSuccess: () => {
            setIsClosing(true)
            setSaveSuccessMessage('Configuração salva com sucesso!')
            startSuccessTimeout()
          }
        }
      )
    }
  })

  const selectedProvider = useSelector(form.store, (state) => state.values.provider)
  const currentModel = useSelector(form.store, (state) => state.values.model)
  const currentApiKey = useSelector(form.store, (state) => state.values.api_key)
  const currentBaseUrl = useSelector(form.store, (state) => state.values.base_url)

  return {
    form,
    selectedProvider,
    currentModel,
    currentApiKey,
    currentBaseUrl,
    isUpdating,
    isClosing,
    updateError,
    saveSuccessMessage,
    resetUpdate,
    setSaveSuccessMessage
  }
}
