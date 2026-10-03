import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { DEFAULT_PROVIDER_MODELS } from '../../constants/providerDefaults'
import { useCredentialEditor } from '../../hooks/useCredentialEditor'
import { useModelDiscovery } from '../../hooks/useModelDiscovery'
import { useProviderConfigQuery } from '../../hooks/useProviderConfigQuery'
import { useProviderFormCore } from '../../hooks/useProviderFormCore'
import { useProviderProbe } from '../../hooks/useProviderProbe'
import type { ProviderConfig, ProviderType } from '../../schemas/settings.schema'

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
  const savedProviders = initialConfig.saved_providers || []
  const savedConfigs = initialConfig.saved_configs || {}

  // 1. Hook Principal do Formulário (ciclo de vida, validação e mutação com fencing)
  const {
    form,
    selectedProvider,
    currentModel,
    currentApiKey,
    currentBaseUrl,
    isUpdating,
    isClosing,
    updateError,
    saveSuccessMessage,
    resetUpdate
  } = useProviderFormCore({ initialConfig, onSuccess, isStreaming })

  // 2. Hook Granular: Descoberta e Seleção de Modelos
  const {
    discoveredModels,
    isCustomModel,
    setIsCustomModel,
    handleModelsDiscovered,
    resetDiscovery
  } = useModelDiscovery((firstModel) => {
    form.setFieldValue('model', firstModel)
  })

  // 3. Hook Granular: Edição de Credenciais (chave salva vs chave em edição)
  const {
    isEditingKey,
    setIsEditingKey,
    handleProviderChanged
  } = useCredentialEditor(initialConfig.provider, savedProviders)

  // 4. Hook Granular: Teste de Conexão / Probe (Injeção direta das dependências reativas)
  const {
    handleTestConnection,
    testResult,
    isTesting,
    isConnected,
    isFailed,
    inputStatus,
    probeErrorMessage,
    resetTest
  } = useProviderProbe({
    provider: selectedProvider,
    model: currentModel,
    apiKey: currentApiKey,
    baseUrl: currentBaseUrl,
    onModelsDiscovered: handleModelsDiscovered
  })

  // Orquestrador de seleção de provedor com sincronização limpa
  const handleProviderSelect = (prov: ProviderType) => {
    if (isStreaming || isClosing || isUpdating) return

    form.setFieldValue('provider', prov)
    const saved = savedConfigs[prov]

    if (saved) {
      form.setFieldValue('model', saved.model || DEFAULT_PROVIDER_MODELS[prov])
      form.setFieldValue('api_key', saved.api_key || '')
      form.setFieldValue('base_url', saved.base_url || (prov === 'local' ? 'http://localhost:1234/v1' : ''))
    } else {
      form.setFieldValue('model', DEFAULT_PROVIDER_MODELS[prov] || '')
      form.setFieldValue('api_key', '')
      form.setFieldValue('base_url', prov === 'local' ? 'http://localhost:1234/v1' : '')
    }

    handleProviderChanged(prov, Boolean(saved))
    resetDiscovery()
    resetTest()
    resetUpdate()
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (isClosing || isUpdating || isStreaming) return
        form.handleSubmit()
      }}
      className="space-y-4"
    >
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

      <ProviderCardGrid
        selectedProvider={selectedProvider}
        initialConfig={initialConfig}
        savedProviders={savedProviders}
        savedConfigs={savedConfigs}
        isStreaming={isStreaming || isClosing || isUpdating}
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

      {updateError ? (
        <Card data-testid="save-error-feedback" className="p-2.5">
          <div className="flex items-center gap-2 text-xs text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{updateError.message}</span>
          </div>
        </Card>
      ) : null}

      {saveSuccessMessage ? (
        <Card data-testid="save-success-feedback" className="p-2.5">
          <div className="flex items-center gap-2 text-xs text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        </Card>
      ) : null}

      <ProviderFormActions
        isTesting={isTesting}
        isUpdating={isUpdating}
        isClosing={isClosing}
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

  // Sem `key={config.provider}` para evitar que o React desmonte o formulário
  // e cancele o timer de fechamento quando o React Query atualizar os dados em background.
  return (
    <ProviderFormContent
      initialConfig={config}
      onSuccess={onSuccess}
      isStreaming={isStreaming}
    />
  )
}
export default ProviderForm
