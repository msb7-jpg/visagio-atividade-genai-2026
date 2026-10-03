O slice `features/settings` sofre do clássico problema do **God Component**: o `ProviderForm.tsx` concentra gerenciamento de formulário (`@tanstack/react-form`), lógica assíncrona de probe/mutação, estado de edição de credenciais, discovery de modelos e renderização de 4 seções de UI distintas (alerta, grid de cards, inputs com status in-line e actions footer).

Abaixo está o plano de refatoração para modularizar a slice de forma limpa, previsível e mantendo `__tests__` no topo.

---

## 1. Nova Estrutura de Pastas da Slice `settings`

Dividimos `components/` por domínios semânticos e extraímos a inteligência pesada de formulário para um hook headless dedicado:

```text
features/settings/
├── components/
│   ├── form/
│   │   ├── __tests__/
│   │   │   └── ProviderForm.test.tsx             <-- Testes focados no fluxo do form
│   │   ├── fields/
│   │   │   ├── ApiKeyField.tsx                   <-- Input + inline status + locked key display
│   │   │   ├── BaseUrlField.tsx                  <-- Input URL local + probe status
│   │   │   └── ModelSelectorField.tsx            <-- Select / Custom text input + discovery
│   │   ├── ProviderCardGrid.tsx                  <-- Grid de cards (Groq, Local, Gemini, etc.)
│   │   ├── ProviderFormActions.tsx               <-- Botões Testar Conexão / Salvar
│   │   └── ProviderForm.tsx                      <-- Orquestrador conciso do formulário
│   │
│   └── modal/
│       ├── __tests__/
│       │   ├── SettingsModal.test.tsx
│       │   └── SettingsModalStreaming.test.tsx
│       └── SettingsModal.tsx                     <-- Modal dialog que consome o ProviderForm
│
├── constants/
│   ├── providerDefaults.ts                       <-- (Novo: PROVIDER_METADATA e DEFAULT_PROVIDER_MODELS)
│   └── settingsQueryKeys.ts
│
├── hooks/
│   ├── useProviderConfigQuery.ts
│   ├── useTestProviderProbeMutation.ts
│   ├── useUpdateProviderConfigMutation.ts
│   └── useProviderFormController.ts              <-- (Novo: headless hook com estado e ações do form)
│
├── schemas/
│   └── settings.schema.ts
└── types/
    └── settings.types.ts

```

---

## 2. Extrações de Suporte (Constantes e Headless Hook)

### A. Constantes: `constants/providerDefaults.ts`

*(Origem: extraído puramente de dentro de `features/settings/components/ProviderForm.tsx`)*

```ts
// features/settings/constants/providerDefaults.ts
import { Bot, HardDrive, Layers, Zap } from 'lucide-react'
import type { ProviderType } from '../schemas/settings.schema'

export const PROVIDER_METADATA: Record<ProviderType, { name: string; icon: typeof Zap }> = {
  groq: { name: 'Groq', icon: Zap },
  local: { name: 'Servidor Local', icon: HardDrive },
  openrouter: { name: 'OpenRouter', icon: Layers },
  google: { name: 'Google Gemini', icon: Bot }
}

export const DEFAULT_PROVIDER_MODELS: Record<ProviderType, string> = {
  groq: 'openai/gpt-oss-20b',
  local: '/home/miguelsb/workspace/llama.cpp/models/Qwen3.5-4B-Q4_K_M.gguf',
  openrouter: 'qwen/qwen3.8-27b:free',
  google: 'gemini-2.5-flash'
}

```

---

### B. Headless Controller Hook: `hooks/useProviderFormController.ts`

*(Origem: isola toda a reatividade, mutações e manipulações do TanStack Form que inflavam `ProviderFormContent`)*

```ts
// features/settings/hooks/useProviderFormController.ts
import { useState } from 'react'
import { useForm, useSelector } from '@tanstack/react-form'
import { useTimeoutFn } from '@reactuses/core'
import { useUpdateProviderConfigMutation } from './useUpdateProviderConfigMutation'
import { useTestProviderProbeMutation } from './useTestProviderProbeMutation'
import { DEFAULT_PROVIDER_MODELS } from '../constants/providerDefaults'
import {
  ProviderConfigFormSchema,
  type ProviderConfig,
  type ProviderType
} from '../schemas/settings.schema'

interface UseProviderFormControllerProps {
  initialConfig: ProviderConfig
  onSuccess?: () => void
  isStreaming?: boolean
}

export function useProviderFormController({
  initialConfig,
  onSuccess,
  isStreaming
}: UseProviderFormControllerProps) {
  const { updateConfig, isUpdating, updateError, resetUpdate } = useUpdateProviderConfigMutation()
  const { testProvider, testResult, isTesting, testError, resetTest } = useTestProviderProbeMutation()
  
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [isCustomModel, setIsCustomModel] = useState(false)

  const savedProviders = initialConfig.saved_providers || []
  const savedConfigs = initialConfig.saved_configs || {}

  const [isEditingKey, setIsEditingKey] = useState<boolean>(
    !savedProviders.includes(initialConfig.provider)
  )

  const [, startSuccessTimeout] = useTimeoutFn(() => {
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
          api_key: value.api_key || null,
          base_url: value.base_url || null,
          timeout_seconds: value.timeout_seconds ?? 30,
          saved_providers: initialConfig.saved_providers ?? [],
          saved_configs: initialConfig.saved_configs ?? {}
        },
        {
          onSuccess: () => {
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

  const handleProviderSelect = (prov: ProviderType) => {
    if (isStreaming) return

    form.setFieldValue('provider', prov)
    const saved = savedConfigs[prov]

    if (saved) {
      form.setFieldValue('model', saved.model || DEFAULT_PROVIDER_MODELS[prov])
      form.setFieldValue('api_key', saved.api_key || '')
      form.setFieldValue('base_url', saved.base_url || (prov === 'local' ? 'http://localhost:1234/v1' : ''))
      setIsEditingKey(false)
    } else {
      form.setFieldValue('model', DEFAULT_PROVIDER_MODELS[prov] || '')
      form.setFieldValue('api_key', '')
      form.setFieldValue('base_url', prov === 'local' ? 'http://localhost:1234/v1' : '')
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
        model: currentModel || null,
        api_key: currentApiKey || null,
        base_url: currentBaseUrl || null,
        timeout_seconds: 10
      })

      if (response?.available_models && response.available_models.length > 0) {
        setDiscoveredModels(response.available_models)
        if (!currentModel || !response.available_models.includes(currentModel)) {
          form.setFieldValue('model', response.available_models[0])
        }
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
    form,
    selectedProvider,
    savedProviders,
    savedConfigs,
    discoveredModels,
    isCustomModel,
    setIsCustomModel,
    isEditingKey,
    setIsEditingKey,
    isConnected,
    isFailed,
    inputStatus,
    probeErrorMessage,
    testResult,
    isTesting,
    isUpdating,
    updateError,
    saveSuccessMessage,
    handleProviderSelect,
    handleTestConnection,
    resetTest
  }
}

```

---

## 3. Subcomponentes Modulares de Formulário

### A. Seleção de Provedor: `components/form/ProviderCardGrid.tsx`

*(Origem: trecho de mapeamento de cards de `ProviderForm.tsx`)*

```tsx
// features/settings/components/form/ProviderCardGrid.tsx
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PROVIDER_METADATA } from '../../constants/providerDefaults'
import type { ProviderConfig, ProviderType } from '../../schemas/settings.schema'

interface ProviderCardGridProps {
  selectedProvider: ProviderType
  initialConfig: ProviderConfig
  savedProviders: ProviderType[]
  savedConfigs: Record<string, Partial<ProviderConfig>>
  isStreaming?: boolean
  onSelect: (provider: ProviderType) => void
}

export function ProviderCardGrid({
  selectedProvider,
  initialConfig,
  savedProviders,
  savedConfigs,
  isStreaming,
  onSelect
}: ProviderCardGridProps) {
  return (
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
          const configuredModel = isActive ? initialConfig.model : savedConfigs[prov]?.model

          return (
            <Card
              key={prov}
              selected={isSelected}
              onClick={() => onSelect(prov)}
              data-testid={`provider-option-${prov}`}
              className={cn('p-3 relative', isStreaming ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className={isSelected ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'} />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">{info.name}</span>
                    <span className={cn('text-[11px] block truncate max-w-[130px] font-mono', configuredModel ? 'text-muted-foreground' : 'text-muted-foreground/60')}>
                      {configuredModel || 'Não configurado'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isActive && (
                    <span data-testid={`active-badge-${prov}`} className="text-[11px] font-medium px-2 py-0.5 rounded bg-primary/15 text-primary">
                      Ativo
                    </span>
                  )}
                  {isSaved && !isActive && (
                    <span data-testid={`saved-badge-${prov}`} className="text-[11px] font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      Salvo
                    </span>
                  )}
                  {isActive && isSaved && <span data-testid={`saved-badge-${prov}`} className="sr-only">Salvo</span>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

```

---

### B. Campo de API Key: `components/form/fields/ApiKeyField.tsx`

*(Origem: isolado do bloco `form.Field name="api_key"` de `ProviderForm.tsx`)*

```tsx
// features/settings/components/form/fields/ApiKeyField.tsx
import { Input } from '@/components/ui/input'
import { AlertTriangle, CheckCircle2, Edit2, Lock } from 'lucide-react'
import { PROVIDER_METADATA } from '../../../constants/providerDefaults'
import type { ProviderType } from '../../../schemas/settings.schema'

interface ApiKeyFieldProps {
  provider: ProviderType
  value: string
  savedKey?: string | null
  isSaved: boolean
  isEditing: boolean
  isConnected: boolean
  isFailed: boolean
  latencyMs?: number
  probeErrorMessage?: string | null
  inputStatus: 'default' | 'success' | 'error'
  onEditChange: (editing: boolean) => void
  onChange: (value: string) => void
  onBlur: () => void
}

export function ApiKeyField({
  provider,
  value,
  savedKey,
  isSaved,
  isEditing,
  isConnected,
  isFailed,
  latencyMs,
  probeErrorMessage,
  inputStatus,
  onEditChange,
  onChange,
  onBlur
}: ApiKeyFieldProps) {
  const hasSavedKey = Boolean(savedKey)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="api-key-input" className="block text-xs font-medium text-foreground">
          Chave de API ({PROVIDER_METADATA[provider].name})
        </label>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span data-testid="inline-status-connected" className="flex items-center gap-1 text-xs font-mono text-accent-emerald">
              <CheckCircle2 className="h-3 w-3" />
              <span>Conectado ({latencyMs} ms)</span>
            </span>
          )}
          {isSaved && !isEditing ? (
            <button
              type="button"
              onClick={() => {
                onEditChange(true)
                onChange('')
              }}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Alterar chave</span>
            </button>
          ) : isSaved && isEditing ? (
            <button
              type="button"
              onClick={() => {
                onEditChange(false)
                onChange(savedKey || '')
              }}
              className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
            >
              Cancelar alteração
            </button>
          ) : null}
        </div>
      </div>

      {isSaved && !isEditing && hasSavedKey ? (
        <div data-testid="locked-key-display" className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-accent-emerald" />
            <span>Chave configurada ({savedKey})</span>
          </span>
          {isConnected && <CheckCircle2 className="h-4 w-4 text-accent-emerald" />}
        </div>
      ) : (
        <div className="relative flex items-center">
          <Input
            id="api-key-input"
            type="password"
            status={inputStatus}
            value={value}
            onBlur={onBlur}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Cole sua chave de API..."
          />
          {isConnected && <CheckCircle2 className="absolute right-2.5 h-4 w-4 text-accent-emerald pointer-events-none" />}
          {isFailed && <AlertTriangle className="absolute right-2.5 h-4 w-4 text-primary pointer-events-none" />}
        </div>
      )}

      {isFailed && probeErrorMessage && (
        <p className="mt-1 text-xs text-primary flex items-center gap-1">
          <span>{probeErrorMessage}</span>
        </p>
      )}
    </div>
  )
}

```

---

### C. Campo de URL Base: `components/form/fields/BaseUrlField.tsx`

*(Origem: isolado do bloco `form.Field name="base_url"` de `ProviderForm.tsx`)*

```tsx
// features/settings/components/form/fields/BaseUrlField.tsx
import { Input } from '@/components/ui/input'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface BaseUrlFieldProps {
  value: string
  isConnected: boolean
  isFailed: boolean
  latencyMs?: number
  probeErrorMessage?: string | null
  inputStatus: 'default' | 'success' | 'error'
  onChange: (value: string) => void
  onBlur: () => void
}

export function BaseUrlField({
  value,
  isConnected,
  isFailed,
  latencyMs,
  probeErrorMessage,
  inputStatus,
  onChange,
  onBlur
}: BaseUrlFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="base-url-input" className="block text-xs font-medium text-foreground">
          URL Base do Servidor Local
        </label>
        {isConnected && (
          <span data-testid="inline-status-connected" className="flex items-center gap-1 text-xs font-mono text-accent-emerald">
            <CheckCircle2 className="h-3 w-3" />
            <span>Conectado ({latencyMs} ms)</span>
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <Input
          id="base-url-input"
          type="text"
          status={inputStatus}
          value={value}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          placeholder="http://localhost:1234/v1"
          required
        />
        {isConnected && <CheckCircle2 className="absolute right-2.5 h-4 w-4 text-accent-emerald pointer-events-none" />}
        {isFailed && <AlertTriangle className="absolute right-2.5 h-4 w-4 text-primary pointer-events-none" />}
      </div>
      {isFailed && probeErrorMessage && (
        <p className="mt-1 text-xs text-primary flex items-center gap-1">
          <span>{probeErrorMessage}</span>
        </p>
      )}
    </div>
  )
}

```

---

### D. Seleção de Modelo: `components/form/fields/ModelSelectorField.tsx`

*(Origem: isolado do bloco `form.Field name="model"` de `ProviderForm.tsx`)*

```tsx
// features/settings/components/form/fields/ModelSelectorField.tsx
import { Input } from '@/components/ui/input'
import { PROVIDER_METADATA } from '../../../constants/providerDefaults'
import type { ProviderType } from '../../../schemas/settings.schema'

interface ModelSelectorFieldProps {
  provider: ProviderType
  value: string
  discoveredModels: string[]
  fallbackModels: string[]
  isCustomModel: boolean
  isConnected: boolean
  isTesting: boolean
  onToggleCustomModel: () => void
  onChange: (val: string) => void
  onBlur: () => void
}

export function ModelSelectorField({
  provider,
  value,
  discoveredModels,
  fallbackModels,
  isCustomModel,
  isConnected,
  isTesting,
  onToggleCustomModel,
  onChange,
  onBlur
}: ModelSelectorFieldProps) {
  const modelOptions = discoveredModels.length > 0
    ? discoveredModels
    : [...new Set([value, ...fallbackModels])].filter(Boolean)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="model-select" className="block text-xs font-medium text-foreground">
          Modelo ({PROVIDER_METADATA[provider].name})
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
            onClick={onToggleCustomModel}
            className="text-[11px] text-primary hover:underline cursor-pointer"
          >
            {isCustomModel ? 'Escolher da lista' : 'Digitar modelo'}
          </button>
        </div>
      </div>

      {isCustomModel ? (
        <Input
          id="custom-model-input"
          type="text"
          value={value}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: openai/gpt-oss-20b"
          className="font-mono text-xs"
          disabled={isTesting}
          required
        />
      ) : (
        <select
          id="model-select"
          disabled={isTesting}
          value={value}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 font-mono"
        >
          {modelOptions.length === 0 && <option value="">Nenhum modelo selecionado</option>}
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}

      {!isConnected && discoveredModels.length === 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Clique em &quot;Testar Conexão&quot; para validar as credenciais e listar todos os modelos disponíveis deste provedor em tempo real.
        </p>
      )}
    </div>
  )
}

```

---

### E. Botões de Ação: `components/form/ProviderFormActions.tsx`

*(Origem: isolado da barra inferior de botões de `ProviderForm.tsx`)*

```tsx
// features/settings/components/form/ProviderFormActions.tsx
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { BookmarkCheck } from 'lucide-react'

interface ProviderFormActionsProps {
  isTesting: boolean
  isUpdating: boolean
  isStreaming?: boolean
  onTestConnection: () => void
}

export function ProviderFormActions({
  isTesting,
  isUpdating,
  isStreaming,
  onTestConnection
}: ProviderFormActionsProps) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-border">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onTestConnection}
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
  )
}

```

---

## 4. O Novo `ProviderForm.tsx` Orquestrador

O arquivo principal agora tem apenas as declarações de layout e montagem de formulário, eliminando toda a sobrecarga visual anterior:

```tsx
// features/settings/components/form/ProviderForm.tsx
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useProviderConfigQuery } from '../../hooks/useProviderConfigQuery'
import { useProviderFormController } from '../../hooks/useProviderFormController'
import { DEFAULT_PROVIDER_MODELS } from '../../constants/providerDefaults'
import type { ProviderConfig } from '../../schemas/settings.schema'

import { ProviderCardGrid } from './ProviderCardGrid'
import { ProviderFormActions } from './ProviderFormActions'
import { ApiKeyField } from './fields/ApiKeyField'
import { BaseUrlField } from './fields/BaseUrlField'
import { ModelSelectorField } from './fields/ModelSelectorField'

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
  const {
    form,
    selectedProvider,
    savedProviders,
    savedConfigs,
    discoveredModels,
    isCustomModel,
    setIsCustomModel,
    isEditingKey,
    setIsEditingKey,
    isConnected,
    isFailed,
    inputStatus,
    probeErrorMessage,
    testResult,
    isTesting,
    isUpdating,
    updateError,
    saveSuccessMessage,
    handleProviderSelect,
    handleTestConnection,
    resetTest
  } = useProviderFormController({ initialConfig, onSuccess, isStreaming })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {isStreaming && (
        <Card data-testid="streaming-active-banner" className="p-3 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Uma consulta analítica está em andamento. A alteração de provedor e testes de conexão ficam temporariamente bloqueados para garantir a estabilidade da sessão.
            </span>
          </div>
        </Card>
      )}

      <ProviderCardGrid
        selectedProvider={selectedProvider}
        initialConfig={initialConfig}
        savedProviders={savedProviders}
        savedConfigs={savedConfigs}
        isStreaming={isStreaming}
        onSelect={handleProviderSelect}
      />

      <div className="space-y-3 pt-2">
        {selectedProvider !== 'local' ? (
          <form.Field name="api_key">
            {(field) => (
              <ApiKeyField
                provider={selectedProvider}
                value={field.state.value}
                savedKey={savedConfigs[selectedProvider]?.api_key}
                isSaved={savedProviders.includes(selectedProvider)}
                isEditing={isEditingKey}
                isConnected={isConnected}
                isFailed={isFailed}
                latencyMs={testResult?.latency_ms}
                probeErrorMessage={probeErrorMessage}
                inputStatus={inputStatus}
                onEditChange={setIsEditingKey}
                onChange={(val) => {
                  resetTest()
                  field.handleChange(val)
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
        ) : (
          <form.Field name="base_url">
            {(field) => (
              <BaseUrlField
                value={field.state.value}
                isConnected={isConnected}
                isFailed={isFailed}
                latencyMs={testResult?.latency_ms}
                probeErrorMessage={probeErrorMessage}
                inputStatus={inputStatus}
                onChange={(val) => {
                  resetTest()
                  field.handleChange(val)
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
        )}

        <form.Field name="model">
          {(field) => (
            <ModelSelectorField
              provider={selectedProvider}
              value={field.state.value}
              discoveredModels={discoveredModels}
              fallbackModels={[
                savedConfigs[selectedProvider]?.model || '',
                DEFAULT_PROVIDER_MODELS[selectedProvider]
              ]}
              isCustomModel={isCustomModel}
              isConnected={isConnected}
              isTesting={isTesting}
              onToggleCustomModel={() => setIsCustomModel(!isCustomModel)}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
      </div>

      {updateError && (
        <Card data-testid="save-error-feedback" className="p-2.5">
          <div className="flex items-center gap-2 text-xs text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{updateError.message}</span>
          </div>
        </Card>
      )}

      {saveSuccessMessage && (
        <Card data-testid="save-success-feedback" className="p-2.5">
          <div className="flex items-center gap-2 text-xs text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        </Card>
      )}

      <ProviderFormActions
        isTesting={isTesting}
        isUpdating={isUpdating}
        isStreaming={isStreaming}
        onTestConnection={handleTestConnection}
      />
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

```

---

## 5. Como os Testes se Conectam

* **`SettingsModal.test.tsx` e `SettingsModalStreaming.test.tsx`:** Ficam isolados em `features/settings/components/modal/__tests__/`, testando a abertura/fechamento do modal e seu comportamento com streaming ativo.
* **Testes unitários de campos ou form:** Ficam alocados em `features/settings/components/form/__tests__/ProviderForm.test.tsx`. Todos os `data-testid` existentes (`provider-option-*`, `active-badge-*`, `saved-badge-*`, `locked-key-display`, `save-success-feedback`, etc.) foram rigorosamente preservados nos subcomponentes para evitar quebras em testes de regressão.