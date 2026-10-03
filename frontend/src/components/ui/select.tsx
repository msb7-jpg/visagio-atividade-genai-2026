import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Propriedades para estilização e feedback visual do componente Select.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Se `true`, destaca as bordas com a cor de erro/atenção.
   * @defaultValue `false`
   */
  error?: boolean
}

/**
 * Dropdown de seleção nativo padronizado do design system em fonte monoespaçada.
 *
 * @param props - Propriedades de estilo, erro e elementos option filhos.
 * @returns Elemento JSX do select renderizado.
 */
export function Select({
  className,
  error = false,
  ref,
  children,
  ...props
}: SelectProps & { ref?: React.Ref<HTMLSelectElement> }): React.JSX.Element {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-xs text-foreground font-mono transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        error && 'border-primary',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
