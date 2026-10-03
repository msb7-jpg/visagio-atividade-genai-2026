import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PROVIDER_METADATA } from '@/features/settings/constants/providerDefaults'
import type { ProviderType } from '@/features/settings/schemas/settings.schema'
import type { JSX } from 'react'

/**
 * Propriedades para o campo de seleção de modelo de LLM.
 */
export interface ModelSelectorFieldProps {
  /** Provedor selecionado ('groq', 'local', 'openrouter', 'google'). */
  provider: ProviderType
  /** Identificador do modelo atualmente escolhido ou digitado. */
  value: string
  /** Lista de modelos descobertos dinamicamente através do probe. */
  discoveredModels: string[]
  /** Lista estática de modelos padrão sugeridos para o provedor. */
  fallbackModels: string[]
  /** Flag indicando modo de digitação livre de modelo. */
  isCustomModel: boolean
  /** Flag indicando que a conexão com o provedor foi verificada com sucesso. */
  isConnected: boolean
  /** Flag indicando se há teste de conexão em andamento. */
  isTesting: boolean
  /** Alterna entre modo dropdown de seleção e input de texto livre. */
  onToggleCustomModel: () => void
  /** Notifica a seleção ou alteração do modelo. */
  onChange: (val: string) => void
  /** Notifica evento onBlur. */
  onBlur: () => void
}

/**
 * Campo seletor de modelos com suporte a dropdown pré-populado, descoberta dinâmica e input livre.
 *
 * @param props - Propriedades de controle e modelos disponíveis.
 * @returns Elemento JSX com o select ou input de modelo.
 */
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
}: ModelSelectorFieldProps): JSX.Element {
  const modelOptions = discoveredModels.length > 0
    ? discoveredModels
    : [...new Set([value, ...fallbackModels])].filter(Boolean)

  let modelStatusText = 'Lista padrão'
  if (discoveredModels.length > 0) {
    modelStatusText = `${discoveredModels.length} modelo(s) carregados`
  } else if (isConnected) {
    modelStatusText = `${modelOptions.length} modelos disponíveis`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="model-select" className="block text-xs font-medium text-foreground">
          Modelo ({PROVIDER_METADATA[provider].name})
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {modelStatusText}
          </span>
          <Button
            type="button"
            variant="link"
            size="link"
            onClick={onToggleCustomModel}
          >
            {isCustomModel ? 'Escolher da lista' : 'Digitar modelo'}
          </Button>
        </div>
      </div>

      {isCustomModel ? (
        <Input
          id="custom-model-input"
          type="text"
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex: openai/gpt-oss-20b"
          disabled={isTesting}
          required
        />
      ) : (
        <Select
          id="model-select"
          disabled={isTesting}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        >
          {modelOptions.length === 0 && <option value="">Nenhum modelo selecionado</option>}
          {modelOptions.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </Select>
      )}

      {!isConnected && discoveredModels.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Clique em &quot;Testar Conexão&quot; para validar as credenciais e listar todos os modelos disponíveis deste provedor em tempo real.
        </p>
      )}
    </div>
  )
}
