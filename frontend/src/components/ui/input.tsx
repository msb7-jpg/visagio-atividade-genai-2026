import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Propriedades para estilização e feedback visual do componente Input.
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Estado de validação visual do campo para estilização das bordas.
   * @defaultValue `'default'`
   */
  status?: 'default' | 'success' | 'error'
}

/**
 * Campo de entrada de texto padronizado do design system com variantes de status.
 *
 * @param props - Propriedades de estilo, status e atributos nativos do elemento input HTML.
 * @returns Elemento JSX do input renderizado.
 */
export function Input({
  className,
  type = 'text',
  status = 'default',
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }): React.JSX.Element {
  const statusStyles = {
    default: 'border-border bg-card focus-visible:border-primary',
    success: 'border-accent-emerald bg-card focus-visible:border-accent-emerald text-foreground',
    error: 'border-primary bg-card focus-visible:border-primary text-foreground'
  }

  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border px-3 py-1 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 font-mono',
        statusStyles[status],
        className
      )}
      data-status={status}
      {...props}
    />
  )
}
