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
  Cpu,
  HardDrive,
  Layers,
  Loader2,
  Sparkles,
  Zap
} from 'lucide-react'
import { useState } from 'react'

const PROVIDER_METADATA: Record<
  ProviderType,
  { name: string; desc: string; defaultModel: string; icon: typeof Zap }
> = {
  groq: {
    name: 'Groq',
    desc: 'Nuvem Ultra-rápida (Llama 3.3)',
    defaultModel: 'llama-3.3-70b-versatile',
    icon: Zap
  },
  local: {
    name: 'Servidor Local',
    desc: 'llama.cpp / LM Studio / Ollama',
    defaultModel: 'Qwen3.5-4B-Q4_K_M',
    icon: HardDrive
  },
  openrouter: {
    name: 'OpenRouter',
    desc: 'Modelos e endpoints unificados',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    icon: Layers
  },
  google: {
    name: 'Google Gemini',
    desc: 'Gemini 2.0 Flash / Pro',
    defaultModel: 'gemini-2.0-flash',
    icon: Sparkles
  },
  openai: {
    name: 'OpenAI',
    desc: 'GPT-4o Mini / GPT-4o',
    defaultModel: 'gpt-4o-mini',
    icon: Cpu
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
          saved_providers: initialConfig.saved_providers ?? []
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

  const savedProviders = initialConfig.saved_providers || []

  const handleProviderSelect = (prov: ProviderType) => {
    form.setFieldValue('provider', prov)
    form.setFieldValue('model', PROVIDER_METADATA[prov].defaultModel)

    form.setFieldValue(
      'base_url',
      prov === 'local' ? 'http://localhost:1234/v1' : ''
    )

    resetTest()
    resetUpdate()
    setSaveSuccessMessage(null)
  }

  const handleTestConnection = async () => {
    setSaveSuccessMessage(null)
    resetUpdate()

    try {
      await testProvider({
        provider: selectedProvider,
        model: currentModel || PROVIDER_METADATA[selectedProvider].defaultModel,
        api_key: currentApiKey ? currentApiKey : null,
        base_url: currentBaseUrl ? currentBaseUrl : null,
        timeout_seconds: 5
      })
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

            return (
              <Card
                key={prov}
                selected={isSelected}
                onClick={() => handleProviderSelect(prov)}
                data-testid={`provider-option-${prov}`}
                className="p-3 cursor-pointer relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={
                        isSelected ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'
                      }
                    />
                    <span className="text-xs font-medium text-foreground">
                      {info.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
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
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {info.desc}
                </p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Configuração do Provedor Selecionado com Feedback In-Line Reativo */}
      <div className="space-y-3 pt-2">
        {selectedProvider !== 'local' ? (
          <form.Field name="api_key">
            {(field) => (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="api-key-input"
                    className="block text-xs font-medium text-foreground"
                  >
                    Chave de API ({PROVIDER_METADATA[selectedProvider].name})
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
                {isFailed && probeErrorMessage ? (
                  <p className="mt-1 text-xs text-primary flex items-center gap-1">
                    <span>{probeErrorMessage}</span>
                  </p>
                ) : null}
              </div>
            )}
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
