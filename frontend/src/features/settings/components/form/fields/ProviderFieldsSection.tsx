import { DEFAULT_PROVIDER_MODELS } from '@/features/settings/constants/providerDefaults'
import type { ProviderFormInstance } from '@/features/settings/hooks/useProviderFormCore'
import type { ProviderConfig, ProviderType } from '@/features/settings/schemas/settings.schema'
import type { JSX } from 'react'
import { ApiKeyField } from './ApiKeyField'
import { BaseUrlField } from './BaseUrlField'
import { ModelSelectorField } from './ModelSelectorField'

/**
 * Propriedades para a seção dinâmica de campos de provedor de LLM.
 */
export interface ProviderFieldsSectionProps {
  /** Instância do formulário TanStack Form. */
  form: ProviderFormInstance
  /** Provedor atualmente selecionado ('groq', 'local', 'openrouter', 'google'). */
  selectedProvider: ProviderType
  /** Lista de provedores com credenciais já persistidas. */
  savedProviders: string[]
  /** Mapa com configurações salvas por provedor. */
  savedConfigs: Record<string, Partial<ProviderConfig>>
  /** Flag de edição da chave de API. */
  isEditingKey: boolean
  /** Lista de modelos descobertos via probe. */
  discoveredModels: string[]
  /** Flag de modelo customizado. */
  isCustomModel: boolean
  /** Flag indicando sucesso no health check. */
  isConnected: boolean
  /** Flag indicando falha no health check. */
  isFailed: boolean
  /** Flag indicando teste em andamento. */
  isTesting: boolean
  /** Latência medida em milissegundos. */
  latencyMs?: number
  /** Mensagem amigável de erro de conexão. */
  probeErrorMessage?: string | null
  /** Status visual derivado para o input. */
  inputStatus: 'default' | 'success' | 'error'
  /** Altera o modo de edição da chave secreta. */
  setIsEditingKey: (editing: boolean) => void
  /** Alterna o modo de modelo customizado. */
  setIsCustomModel: (updater: (prev: boolean) => boolean) => void
  /** Reseta o estado do teste de conexão. */
  resetTest: () => void
}

/**
 * Renderiza os campos dinâmicos de chave de API / URL base e o seletor de modelos de acordo com o provedor.
 *
 * @param props - Propriedades de controle e valores dos campos.
 * @returns Elemento JSX com a seção de campos renderizada.
 */
export function ProviderFieldsSection({
  form,
  selectedProvider,
  savedProviders,
  savedConfigs,
  isEditingKey,
  discoveredModels,
  isCustomModel,
  isConnected,
  isFailed,
  isTesting,
  latencyMs,
  probeErrorMessage,
  inputStatus,
  setIsEditingKey,
  setIsCustomModel,
  resetTest
}: ProviderFieldsSectionProps): JSX.Element {
  return (
    <div className="space-y-3 pt-2 border-t border-border">
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
              latencyMs={latencyMs}
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
              latencyMs={latencyMs}
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
            ].filter(Boolean)}
            isCustomModel={isCustomModel}
            isConnected={isConnected}
            isTesting={isTesting}
            onToggleCustomModel={() => setIsCustomModel((prev) => !prev)}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
    </div>
  )
}
