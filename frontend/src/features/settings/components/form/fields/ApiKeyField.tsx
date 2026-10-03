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
