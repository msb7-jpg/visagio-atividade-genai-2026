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
              ? `${discoveredModels.length} modelo(s) carregados`
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
          onChange={(event) => onChange(event.target.value)}
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
