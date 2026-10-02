import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useProviderConfigQuery } from '@/features/settings/hooks/useProviderConfigQuery'
import { useTestProviderProbeMutation } from '@/features/settings/hooks/useTestProviderProbeMutation'
import { useUpdateProviderConfigMutation } from '@/features/settings/hooks/useUpdateProviderConfigMutation'
import {
  ProviderConfigFormSchema,
  type ProviderConfig,
  type ProviderType
} from '@/features/settings/schemas/settings.schema'
import { useTimeoutFn } from '@reactuses/core'
import { useForm, useSelector } from '@tanstack/react-form'
import {
  AlertTriangle,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Edit2,
  HardDrive,
  Layers,
  Loader2,
  Lock,
  Sparkles,
  Zap
} from 'lucide-react'
import { useState } from 'react'

const PROVIDER_METADATA: Record<
  ProviderType,
  {
    name: string
    defaultModel: string
    suggestedModels: string[]
    icon: typeof Zap
  }
> = {
  groq: {
    name: 'Groq',
    defaultModel: 'openai/gpt-oss-120b',
    suggestedModels: [
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b'
    ],
    icon: Zap
  },
  local: {
    name: 'Servidor Local',
    defaultModel: 'Qwen3.5-4B-Q4_K_M',
    suggestedModels: [
      'Qwen3.5-4B-Q4_K_M',
      'llama-3.2-3b-instruct',
      'mistral-7b-instruct'
    ],
    icon: HardDrive
  },
  openrouter: {
    name: 'OpenRouter',
    defaultModel: 'apodex/apodex-1.1-mini:free',
    suggestedModels: [
      'apodex/apodex-1.1-mini:free',
      'qwen/qwen3.8-27b:free',
      'google/gemma-4-26b-a4b-it:free',
      'liquid/lfm-2.5-2.6b:free',
      'nvidia/nemotron-3.5-lightning:free'
    ],
    icon: Layers
  },
  google: {
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    suggestedModels: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite'
    ],
    icon: Sparkles
  }
}

export interface ProviderFormProps {
  onSuccess?: () => void
}

function ProviderFormContent({
  initialConfig,
  onSuccess
}: {
  initialConfig: ProviderConfig
  onSuccess?: () => void
}) {
  const { updateConfig, isUpdating, updateError, resetUpdate } = useUpdateProviderConfigMutation()
  const { testProvider, testResult, isTesting, testError, resetTest } = useTestProviderProbeMutation()
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])

  const savedProviders = initialConfig.saved_providers || []
  const savedConfigs = initialConfig.saved_configs || {}

  // Se o provedor atual já está salvo no banco, começa bloqueado; senão, aberto para edição
  const [isEditingKey, setIsEditingKey] = useState<boolean>(
    !savedProviders.includes(initialConfig.provider)
  )

  const [_isPending, start] = useTimeoutFn(() => {
    onSuccess?.()
  }, 800, { immediate: false })

  const form = useForm({
    defaultValues: {
      provider: initialConfig.provider,
      model: initialConfig.model,
      api_key: initialConfig.api_key ?? '',
      base_url: initialConfig.base_url ?? '',
      timeout_seconds: initialConfig.timeout_seconds ?? 30
    },
    validators: {
      onSubmit: ProviderConfigFormSchema
    },
    onSubmit: ({ value }) => {
      setSaveSuccessMessage(null)
      resetUpdate()

      // Usando callbacks de mutação do TanStack Query diretamente em mutate()
      updateConfig(
        {
          provider: value.provider,
          model: value.model || PROVIDER_METADATA[value.provider].defaultModel,
          api_key: value.api_key ? value.api_key : null,
          base_url: value.base_url ? value.base_url : null,
          timeout_seconds: value.timeout_seconds ?? 30,
          saved_providers: initialConfig.saved_providers ?? [],
          saved_configs: initialConfig.saved_configs ?? {}
        },
        {
          onSuccess: () => {
            setSaveSuccessMessage('Configuração salva com sucesso!')
            start()
          }
        }
      )
    }
  })

  const selectedProvider = useSelector(form.store, (state) => state.values.provider)
  const currentModel = useSelector(form.store, (state) => state.values.model)
  const currentApiKey = useSelector(form.store, (state) => state.values.api_key)
  const currentBaseUrl = useSelector(form.store, (state) => state.values.base_url)

  const handleProviderSelect = (prov: ProviderType) => {
    form.setFieldValue('provider', prov)

    // Se já tiver configuração salva deste provedor no banco, carrega os dados salvos!
    const saved = savedConfigs[prov]
    if (saved) {
      form.setFieldValue('model', saved.model || PROVIDER_METADATA[prov].defaultModel)
      form.setFieldValue('api_key', saved.api_key || '')
      form.setFieldValue(
        'base_url',
        saved.base_url || (prov === 'local' ? 'http://localhost:1234/v1' : '')
      )
      setIsEditingKey(false)
    } else {
      form.setFieldValue('model', PROVIDER_METADATA[prov].defaultModel)
      form.setFieldValue('api_key', '')
      form.setFieldValue(
        'base_url',
        prov === 'local' ? 'http://localhost:1234/v1' : ''
      )
      setIsEditingKey(true)
    }

    setDiscoveredModels([])
    resetTest()
    resetUpdate()
    setSaveSuccessMessage(null)
  }

  const handleTestConnection = async () => {
    setSaveSuccessMessage(null)
    resetUpdate()

    try {
      const response = await testProvider({
        provider: selectedProvider,
        model: currentModel || PROVIDER_METADATA[selectedProvider].defaultModel,
        api_key: currentApiKey ? currentApiKey : null,
        base_url: currentBaseUrl ? currentBaseUrl : null,
        timeout_seconds: 10
      })

      if (response?.success && response.available_models && response.available_models.length > 0) {
        setDiscoveredModels(response.available_models)
        if (!response.available_models.includes(currentModel)) {
          form.setFieldValue('model', response.available_models[0])
        }
      }
    } catch {
      // testError já é gerenciado pelo TanStack Query e refletido na UI
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

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {/* Grade de Seleção de Provedor */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Selecione o Provedor de IA
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(PROVIDER_METADATA) as ProviderType[]).map((prov) => {
            const info = PROVIDER_METADATA[prov]
            const Icon = info.icon
            const isSelected = selectedProvider === prov
            const isSaved = savedProviders.includes(prov)
            const isActive = initialConfig.provider === prov

            return (
              <Card
                key={prov}
                selected={isSelected}
                onClick={() => handleProviderSelect(prov)}
                data-testid={`provider-option-${prov}`}
                className="p-3 cursor-pointer relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={
                        isSelected ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'
                      }
                    />
                    <div>
                      <span className="text-xs font-medium text-foreground block">
                        {info.name}
                      </span>
                      {isActive ? (
                        <span className="text-xs text-muted-foreground block truncate max-w-32">
                          {initialConfig.model}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span
                        data-testid={`active-badge-${prov}`}
                        className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary"
                        title={`Provedor atualmente ativo no sistema (${initialConfig.model})`}
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Ativo</span>
                      </span>
                    ) : null}
                    {isSaved ? (
                      <span
                        data-testid={`saved-badge-${prov}`}
                        className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-card border border-border text-accent-emerald"
                        title="Configuração salva no banco de dados"
                      >
                        <Check className="h-3 w-3" />
                        <span>Salvo</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Configuração do Provedor Selecionado com Feedback In-Line Reativo */}
      <div className="space-y-3 pt-2">
        {selectedProvider !== 'local' ? (
          <form.Field name="api_key">
            {(field) => {
              const isSaved = savedProviders.includes(selectedProvider)
              const hasSavedKey = Boolean(savedConfigs[selectedProvider]?.api_key)

              return (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="api-key-input"
                      className="block text-xs font-medium text-foreground"
                    >
                      Chave de API ({PROVIDER_METADATA[selectedProvider].name})
                    </label>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <span
                          data-testid="inline-status-connected"
                          className="flex items-center gap-1 text-xs font-mono text-accent-emerald"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Conectado ({testResult?.latency_ms} ms)</span>
                        </span>
                      ) : null}
                      {isSaved && !isEditingKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingKey(true)
                            field.handleChange('')
                          }}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Alterar chave</span>
                        </button>
                      ) : isSaved && isEditingKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingKey(false)
                            field.handleChange(savedConfigs[selectedProvider]?.api_key || '')
                          }}
                          className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                        >
                          Cancelar alteração
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isSaved && !isEditingKey && hasSavedKey ? (
                    <div
                      data-testid="locked-key-display"
                      className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-accent-emerald" />
                        <span>Chave segura configurada no servidor ({savedConfigs[selectedProvider]?.api_key})</span>
                      </span>
                      {isConnected ? (
                        <CheckCircle2 className="h-4 w-4 text-accent-emerald" />
                      ) : null}
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <Input
                        id="api-key-input"
                        type="password"
                        status={inputStatus}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          resetTest()
                          field.handleChange(event.target.value)
                        }}
                        placeholder="Cole sua chave de API..."
                      />
                      {isConnected ? (
                        <CheckCircle2 className="absolute right-2.5 h-4 w-4 text-accent-emerald pointer-events-none" />
                      ) : null}
                      {isFailed ? (
                        <AlertTriangle className="absolute right-2.5 h-4 w-4 text-primary pointer-events-none" />
                      ) : null}
                    </div>
                  )}

                  {isFailed && probeErrorMessage ? (
                    <p className="mt-1 text-xs text-primary flex items-center gap-1">
                      <span>{probeErrorMessage}</span>
                    </p>
                  ) : null}
                </div>
              )
            }}
          </form.Field>
        ) : (
          <form.Field name="base_url">
            {(field) => (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="base-url-input"
                    className="block text-xs font-medium text-foreground"
                  >
                    URL Base do Servidor Local
                  </label>
                  {isConnected ? (
                    <span
                      data-testid="inline-status-connected"
                      className="flex items-center gap-1 text-xs font-mono text-accent-emerald"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Conectado ({testResult?.latency_ms} ms)</span>
                    </span>
                  ) : null}
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="base-url-input"
                    type="text"
                    status={inputStatus}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      resetTest()
                      field.handleChange(event.target.value)
                    }}
                    placeholder="http://localhost:1234/v1"
                    required
                  />
                  {isConnected ? (
                    <CheckCircle2 className="absolute right-2.5 h-4 w-4 text-accent-emerald pointer-events-none" />
                  ) : null}
                  {isFailed ? (
                    <AlertTriangle className="absolute right-2.5 h-4 w-4 text-primary pointer-events-none" />
                  ) : null}
                </div>
                {isFailed && probeErrorMessage ? (
                  <p className="mt-1 text-xs text-primary flex items-center gap-1">
                    <span>{probeErrorMessage}</span>
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>
        )}

        {/* Campo de Modelo com Dropdown (habilitado após testar conexão com sucesso) */}
        <form.Field name="model">
          {(field) => {
            // Se tiver modelos obtidos da API, usa-os; caso contrário, usa a lista de sugestões do provedor
            const modelOptions =
              discoveredModels.length > 0
                ? discoveredModels
                : [
                    ...new Set([
                      field.state.value,
                      PROVIDER_METADATA[selectedProvider].defaultModel,
                      ...PROVIDER_METADATA[selectedProvider].suggestedModels
                    ])
                  ].filter(Boolean)

            return (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="model-select"
                    className="block text-xs font-medium text-foreground"
                  >
                    Modelo ({PROVIDER_METADATA[selectedProvider].name})
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {isConnected
                      ? `${modelOptions.length} modelos disponíveis`
                      : 'Teste a conexão para carregar'}
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="model-select"
                    disabled={!isConnected || isTesting}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  >
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                {!isConnected ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Clique em &quot;Testar Conexão&quot; para validar as credenciais e listar os modelos disponíveis deste provedor.
                  </p>
                ) : null}
              </div>
            )
          }}
        </form.Field>
      </div>

      {/* Erro de mutação do TanStack Query exibido amigavelmente */}
      {updateError ? (
        <Card data-testid="save-error-feedback" className="p-2.5">
          <div className="flex items-center gap-2 text-xs text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{updateError.message}</span>
          </div>
        </Card>
      ) : null}

      {/* Feedback de sucesso */}
      {saveSuccessMessage ? (
        <Card data-testid="save-success-feedback" className="p-2.5">
          <div className="flex items-center gap-2 text-xs text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        </Card>
      ) : null}

      {/* Ações: Testar Conexão e Salvar */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={isTesting || isUpdating}
        >
          <span className="flex items-center gap-1.5">
            {isTesting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Testando conexão...</span>
              </>
            ) : (
              <span>Testar Conexão</span>
            )}
          </span>
        </Button>

        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={isUpdating || isTesting}
        >
          <span className="flex items-center gap-1.5">
            {isUpdating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <BookmarkCheck className="h-3.5 w-3.5" />
                <span>Salvar Configuração</span>
              </>
            )}
          </span>
        </Button>
      </div>
    </form>
  )
}

export function ProviderForm({ onSuccess }: ProviderFormProps) {
  const { config, isLoading } = useProviderConfigQuery()

  if (isLoading || !config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-xs text-muted-foreground">
          Carregando configurações...
        </span>
      </div>
    )
  }

  return (
    <ProviderFormContent
      key={`${config.provider}-${config.model}`}
      initialConfig={config}
      onSuccess={onSuccess}
    />
  )
}
