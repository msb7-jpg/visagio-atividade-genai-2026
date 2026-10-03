import { useTimeoutFn } from '@reactuses/core'
import { useForm, useSelector } from '@tanstack/react-form'
import { useState } from 'react'
import {
  ProviderConfigFormSchema,
  type ProviderConfig
} from '../schemas/settings.schema'
import { useUpdateProviderConfigMutation } from './useUpdateProviderConfigMutation'

export interface UseProviderFormCoreProps {
  initialConfig: ProviderConfig
  onSuccess?: () => void
  isStreaming?: boolean
}

export function useProviderFormCore({
  initialConfig,
  onSuccess,
  isStreaming
}: UseProviderFormCoreProps) {
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
