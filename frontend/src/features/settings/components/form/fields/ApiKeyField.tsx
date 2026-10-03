import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PROVIDER_METADATA } from '@/features/settings/constants/providerDefaults'
import type { ProviderType } from '@/features/settings/schemas/settings.schema'
import { AlertTriangle, CheckCircle2, Edit2, Lock } from 'lucide-react'
import type { JSX } from 'react'

/**
 * Propriedades para o campo de chave de API secreta.
 */
export interface ApiKeyFieldProps {
  /** Provedor selecionado ('groq', 'local', 'openrouter', 'google'). */
  provider: ProviderType
  /** Valor atual no input de texto da chave. */
  value: string
  /** Chave mascarada salva anteriormente no backend ou nulo. */
  savedKey?: string | null
  /** Indica se o provedor já possui credenciais persistidas no SQLite. */
  isSaved: boolean
  /** Indica se o usuário está em modo de edição de nova chave. */
  isEditing: boolean
  /** Flag de sucesso no teste de conectividade. */
  isConnected: boolean
  /** Flag de falha no teste de conectividade. */
  isFailed: boolean
  /** Latência medida em milissegundos durante o probe. */
  latencyMs?: number
  /** Mensagem de erro de conexão retornada pelo probe. */
  probeErrorMessage?: string | null
  /** Status visual para estilização da borda do input. */
  inputStatus: 'default' | 'success' | 'error'
  /** Altera o estado de edição da chave. */
  onEditChange: (editing: boolean) => void
  /** Notifica a mudança de valor no formulário. */
  onChange: (value: string) => void
  /** Notifica evento onBlur para validação. */
  onBlur: () => void
}

/**
 * Campo de formulário protegido para credenciais de API com suporte a máscara de asteriscos e health check inline.
 *
 * @param props - Propriedades de controle e estado do campo de chave.
 * @returns Elemento JSX do campo de credencial.
 */
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
}: ApiKeyFieldProps): JSX.Element {
  const hasSavedKey = Boolean(savedKey)

  let editButton = null
  if (isSaved && !isEditing) {
    editButton = (
      <Button
        type="button"
        variant="link"
        size="link"
        onClick={() => {
          onEditChange(true)
          onChange('')
        }}
      >
        <span className="flex items-center gap-1">
          <Edit2 className="h-3 w-3" />
          <span>Alterar chave</span>
        </span>
      </Button>
    )
  } else if (isSaved && isEditing) {
    editButton = (
      <Button
        type="button"
        variant="link"
        size="link"
        onClick={() => {
          onEditChange(false)
          onChange(savedKey || '')
        }}
      >
        Cancelar alteração
      </Button>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="api-key-input" className="block text-xs font-medium text-foreground">
          Chave de API ({PROVIDER_METADATA[provider].name})
        </label>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span data-testid="inline-status-connected" className="flex items-center gap-1 text-xs font-mono text-accent-emerald">
              <CheckCircle2 className="h-3 w-3" />
              <span>Conectado ({latencyMs} ms)</span>
            </span>
          ) : null}
          {editButton}
        </div>
      </div>

      {isSaved && !isEditing && hasSavedKey ? (
        <div data-testid="locked-key-display" className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-accent-emerald" />
            <span>Chave configurada ({savedKey})</span>
          </span>
          {isConnected ? <CheckCircle2 className="h-4 w-4 text-accent-emerald" /> : null}
        </div>
      ) : (
        <div className="relative flex items-center">
          <Input
            id="api-key-input"
            type="password"
            status={inputStatus}
            value={value}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Cole sua chave de API..."
          />
          {isConnected ? <CheckCircle2 className="absolute right-2.5 h-4 w-4 text-accent-emerald pointer-events-none" /> : null}
          {isFailed ? <AlertTriangle className="absolute right-2.5 h-4 w-4 text-primary pointer-events-none" /> : null}
        </div>
      )}

      {isFailed && probeErrorMessage ? (
        <p className="mt-1 text-xs text-primary flex items-center gap-1">
          <span>{probeErrorMessage}</span>
        </p>
      ) : null}
    </div>
  )
}
