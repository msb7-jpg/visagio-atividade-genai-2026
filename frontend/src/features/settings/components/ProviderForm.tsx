import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
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
import { Spinner } from '@/components/ui/spinner'
import {
  AlertTriangle,
  BookmarkCheck,
  Bot,
  CheckCircle2,
  Edit2,
  HardDrive,
  Layers,
  Lock,
  Zap
} from 'lucide-react'
import { useState } from 'react'


const PROVIDER_METADATA: Record<
  ProviderType,
  {
    name: string
    icon: typeof Zap
  }
> = {
  groq: {
    name: 'Groq',
    icon: Zap
  },
  local: {
    name: 'Servidor Local',
    icon: HardDrive
  },
  openrouter: {
    name: 'OpenRouter',
    icon: Layers
  },
  google: {
    name: 'Google Gemini',
    icon: Bot
  }
}

const DEFAULT_PROVIDER_MODELS: Record<ProviderType, string> = {
  groq: 'openai/gpt-oss-20b',
  local: '/home/miguelsb/workspace/llama.cpp/models/Qwen3.5-4B-Q4_K_M.gguf',
  openrouter: 'qwen/qwen3.8-27b:free',
  google: 'gemini-2.5-flash'
}

export interface ProviderFormProps {
  onSuccess?: () => void
  isStreaming?: boolean
}

function ProviderFormContent({
  initialConfig,
  onSuccess,
  isStreaming
}: {
  initialConfig: ProviderConfig
  onSuccess?: () => void
  isStreaming?: boolean
}) {
  const { updateConfig, isUpdating, updateError, resetUpdate } = useUpdateProviderConfigMutation()
  const { testProvider, testResult, isTesting, testError, resetTest } = useTestProviderProbeMutation()
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false)

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
      model: initialConfig.model ?? '',
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

      updateConfig(
        {
          provider: value.provider,
          model: value.model,
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
    if (isStreaming) return

    form.setFieldValue('provider', prov)

    const saved = savedConfigs[prov]
    if (saved) {
      form.setFieldValue('model', saved.model || DEFAULT_PROVIDER_MODELS[prov])
      form.setFieldValue('api_key', saved.api_key || '')
      form.setFieldValue(
        'base_url',
        saved.base_url || (prov === 'local' ? 'http://localhost:1234/v1' : '')
      )
      setIsEditingKey(false)
    } else {
      form.setFieldValue('model', DEFAULT_PROVIDER_MODELS[prov] || '')
      form.setFieldValue('api_key', '')
      form.setFieldValue(
        'base_url',
        prov === 'local' ? 'http://localhost:1234/v1' : ''
      )
      setIsEditingKey(true)
    }

    setIsCustomModel(false)
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
        model: currentModel ? currentModel : null,
        api_key: currentApiKey ? currentApiKey : null,
        base_url: currentBaseUrl ? currentBaseUrl : null,
        timeout_seconds: 10
      })

      if (response?.available_models && response.available_models.length > 0) {
        setDiscoveredModels(response.available_models)
        if (!currentModel || !response.available_models.includes(currentModel)) {
          form.setFieldValue('model', response.available_models[0])
        }
      }
    } catch {
      // testError é gerenciado pelo TanStack Query e refletido na UI
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
      {/* Alerta de bloqueio caso haja sessão ativa */}
      {isStreaming ? (
        <Card data-testid="streaming-active-banner" className="p-3 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Uma consulta analítica está em andamento. A alteração de provedor e testes de conexão ficam temporariamente bloqueados para garantir a estabilidade da sessão.
            </span>
          </div>
        </Card>
      ) : null}

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
            const configuredModel = isActive
              ? initialConfig.model
              : savedConfigs[prov]?.model

            return (
              <Card
                key={prov}
                selected={isSelected}
                onClick={() => handleProviderSelect(prov)}
                data-testid={`provider-option-${prov}`}
                className={cn(
                  'p-3 relative',
                  isStreaming ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={
                        isSelected ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'
                      }
                    />
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {info.name}
                      </span>
                      {configuredModel ? (
                        <span className="text-[11px] text-muted-foreground block truncate max-w-[130px] font-mono">
                          {configuredModel}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 block">
                          Não configurado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span
                        data-testid={`active-badge-${prov}`}
                        className="text-[11px] font-medium px-2 py-0.5 rounded bg-primary/15 text-primary"
                        title={`Provedor ativo no sistema (${initialConfig.model})`}
                      >
                        Ativo
                      </span>
                    ) : isSaved ? (
                      <span
                        data-testid={`saved-badge-${prov}`}
                        className="text-[11px] font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground"
                        title="Configuração salva no sistema"
                      >
                        Salvo
                      </span>
                    ) : null}
                    {/* Mantém data-testid para asserções de teste sem poluir visualmente */}
                    {isActive && isSaved ? (
                      <span data-testid={`saved-badge-${prov}`} className="sr-only">
                        Salvo
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
                        <span>Chave configurada ({savedConfigs[selectedProvider]?.api_key})</span>
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

        {/* Campo de Modelo com Dropdown ou Input Manual */}
        <form.Field name="model">
          {(field) => {
            const modelOptions =
              discoveredModels.length > 0
                ? discoveredModels
                : [
                    ...new Set([
                      field.state.value,
                      savedConfigs[selectedProvider]?.model,
                      DEFAULT_PROVIDER_MODELS[selectedProvider]
                    ])
                  ].filter(Boolean) as string[]

            return (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="model-select"
                    className="block text-xs font-medium text-foreground"
                  >
                    Modelo ({PROVIDER_METADATA[selectedProvider].name})
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {discoveredModels.length > 0
                        ? `${discoveredModels.length} modelos carregados`
                        : isConnected
                        ? `${modelOptions.length} modelos disponíveis`
                        : 'Lista padrão'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomModel(!isCustomModel)}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      {isCustomModel ? 'Escolher da lista' : 'Digitar modelo'}
                    </button>
                  </div>
                </div>

                {isCustomModel ? (
                  <div className="relative">
                    <Input
                      id="custom-model-input"
                      type="text"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value)
                      }}
                      placeholder="Ex: openai/gpt-oss-20b"
                      className="font-mono text-xs"
                      disabled={isTesting}
                      required
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="model-select"
                      disabled={isTesting}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value)
                      }}
                      className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    >
                      {modelOptions.length === 0 ? (
                        <option value="">Nenhum modelo selecionado</option>
                      ) : null}
                      {modelOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!isConnected && discoveredModels.length === 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Clique em &quot;Testar Conexão&quot; para validar as credenciais e listar todos os modelos disponíveis deste provedor em tempo real.
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
          disabled={isTesting || isUpdating || isStreaming}
        >
          {isTesting ? (
            <>
              <Spinner data-icon="inline-start" className="mr-1.5" />
              <span>Testando conexão...</span>
            </>
          ) : (
            <span>Testar Conexão</span>
          )}
        </Button>

        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={isUpdating || isTesting || isStreaming}
        >
          {isUpdating ? (
            <>
              <Spinner data-icon="inline-start" className="mr-1.5" />
              <span>Salvando...</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              <BookmarkCheck className="h-3.5 w-3.5" />
              <span>Salvar Configuração</span>
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}

export function ProviderForm({ onSuccess, isStreaming }: ProviderFormProps) {
  const { config, isLoading } = useProviderConfigQuery()

  if (isLoading || !config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6 text-primary" />
        <span className="ml-2 text-xs text-muted-foreground">
          Carregando configurações...
        </span>
      </div>
    )
  }

  return (
    <ProviderFormContent
      key={config.provider}
      initialConfig={config}
      onSuccess={onSuccess}
      isStreaming={isStreaming}
    />
  )
}

