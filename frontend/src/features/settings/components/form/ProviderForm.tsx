import { Spinner } from '@/components/ui/spinner'
import { DEFAULT_PROVIDER_MODELS } from '@/features/settings/constants/providerDefaults'
import { useCredentialEditor } from '@/features/settings/hooks/useCredentialEditor'
import { useModelDiscovery } from '@/features/settings/hooks/useModelDiscovery'
import { useProviderConfigQuery } from '@/features/settings/hooks/useProviderConfigQuery'
import { useProviderFormCore } from '@/features/settings/hooks/useProviderFormCore'
import { useProviderProbe } from '@/features/settings/hooks/useProviderProbe'
import type { ProviderConfig, ProviderType } from '@/features/settings/schemas/settings.schema'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { ProviderCardGrid } from './ProviderCardGrid'
import { ProviderFormActions } from './ProviderFormActions'
import { ProviderFieldsSection } from './fields/ProviderFieldsSection'

/**
 * Propriedades para renderização do formulário de configuração de provedores.
 */
export interface ProviderFormProps {
  /** Callback executado após a conclusão com sucesso do salvamento. */
  onSuccess?: () => void
  /**
   * Indica se há streaming ativo bloqueando edições no momento.
   * @defaultValue `false`
   */
  isStreaming?: boolean
}

/**
 * Conteúdo interno do formulário após o carregamento da configuração inicial.
 *
 * @param props - Propriedades contendo initialConfig, onSuccess e isStreaming.
 * @returns Elemento JSX do formulário completo.
 */
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
      data-testid="provider-form"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (isClosing || isUpdating || isStreaming) return
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {isStreaming ? (
        <div data-testid="streaming-active-banner" className="rounded-xl border border-primary/30 bg-primary/10 p-3">
          <div className="flex items-center gap-2 text-xs text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Uma consulta analítica está em andamento. A alteração de provedor e testes de conexão ficam temporariamente bloqueados para garantir a estabilidade da sessão.
            </span>
          </div>
        </div>
      ) : null}

      <ProviderCardGrid
        selectedProvider={selectedProvider}
        initialConfig={initialConfig}
        savedProviders={savedProviders}
        savedConfigs={savedConfigs}
        isStreaming={isStreaming || isClosing || isUpdating}
        onSelect={handleProviderSelect}
      />

      <ProviderFieldsSection
        form={form}
        selectedProvider={selectedProvider}
        savedProviders={savedProviders}
        savedConfigs={savedConfigs}
        isEditingKey={isEditingKey}
        discoveredModels={discoveredModels}
        isCustomModel={isCustomModel}
        isConnected={isConnected}
        isFailed={isFailed}
        isTesting={isTesting}
        latencyMs={testResult?.latency_ms}
        probeErrorMessage={probeErrorMessage}
        inputStatus={inputStatus}
        setIsEditingKey={setIsEditingKey}
        setIsCustomModel={setIsCustomModel}
        resetTest={resetTest}
      />

      {saveSuccessMessage ? (
        <div data-testid="save-success-feedback" className="flex items-center gap-2 p-2.5 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 text-xs font-medium text-accent-emerald animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      ) : null}

      {updateError ? (
        <div data-testid="save-error-feedback" className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/10 text-xs font-medium text-primary animate-in fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{updateError.message || 'Falha ao salvar configuração.'}</span>
        </div>
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

/**
 * Formulário completo de gerenciamento de provedores de IA com carregamento via React Query e feedback de validação.
 *
 * @param props - Propriedades de configuração do formulário.
 * @returns Elemento JSX com spinner durante loading ou o formulário montado.
 */
export function ProviderForm({ onSuccess, isStreaming }: ProviderFormProps) {
  const { config, isLoading } = useProviderConfigQuery()

  if (isLoading || !config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-2 text-xs text-muted-foreground">
          Carregando configurações...
        </span>
      </div>
    )
  }

  return (
    <ProviderFormContent
      initialConfig={config}
      onSuccess={onSuccess}
      isStreaming={isStreaming}
    />
  )
}
export default ProviderForm
