import { Input } from '@/components/ui/input'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { JSX } from 'react'

/**
 * Propriedades para o campo de URL base de servidores locais (LM Studio, Ollama, etc.).
 */
export interface BaseUrlFieldProps {
  /** Valor atual no input de URL. */
  value: string
  /** Flag de sucesso no teste de conectividade com o servidor local. */
  isConnected: boolean
  /** Flag de falha de conexão. */
  isFailed: boolean
  /** Latência medida em milissegundos durante o probe. */
  latencyMs?: number
  /** Mensagem amigável de erro de conexão. */
  probeErrorMessage?: string | null
  /** Status visual da borda do input. */
  inputStatus: 'default' | 'success' | 'error'
  /** Notifica a mudança de valor no formulário. */
  onChange: (value: string) => void
  /** Notifica evento onBlur. */
  onBlur: () => void
}

/**
 * Campo de formulário para configuração da URL base de provedores locais com status de conexão inline.
 *
 * @param props - Propriedades de controle e estado do endpoint HTTP local.
 * @returns Elemento JSX com o input estilizado e indicadores visuais.
 */
export function BaseUrlField({
  value,
  isConnected,
  isFailed,
  latencyMs,
  probeErrorMessage,
  inputStatus,
  onChange,
  onBlur
}: BaseUrlFieldProps): JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="base-url-input" className="block text-xs font-medium text-foreground">
          URL Base do Servidor Local
        </label>
        {isConnected ? (
          <span data-testid="inline-status-connected" className="flex items-center gap-1 text-xs font-mono text-accent-emerald">
            <CheckCircle2 className="h-3 w-3" />
            <span>Conectado ({latencyMs} ms)</span>
          </span>
        ) : null}
      </div>
      <div className="relative flex items-center">
        <Input
          id="base-url-input"
          type="text"
          status={inputStatus}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder="http://localhost:1234/v1"
          required
        />
        {isConnected ? <CheckCircle2 className="absolute right-2.5 h-4 w-4 text-accent-emerald pointer-events-none" /> : null}
        {isFailed ? <AlertTriangle className="absolute right-2.5 h-4 w-4 text-primary pointer-events-none" /> : null}
      </div>
      {isFailed && probeErrorMessage ? (
        <p className="mt-1 text-xs text-primary flex items-center gap-1">
          <span>{probeErrorMessage}</span>
        </p>
      ) : null}
    </div>
  )
}
