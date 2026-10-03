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
