import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Propriedades para estilização e estado do componente Card.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Se `true`, destaca a borda com a cor primária indicando seleção ativa.
   * @defaultValue `false`
   */
  selected?: boolean
  /**
   * Se `true`, desativa a interação do card e aplica opacidade visual.
   * @defaultValue `false`
   */
  disabled?: boolean
}

/**
 * Card base com suporte a estado selecionado e desabilitado para o design system.
 *
 * @param props - Propriedades de estilo e atributos HTML do elemento div.
 * @returns Elemento JSX do card.
 */
export function Card({
  className,
  selected = false,
  disabled = false,
  ref,
  ...props
}: CardProps & { ref?: React.Ref<HTMLDivElement> }): React.JSX.Element {
  return (
    <div
      ref={ref}
      aria-disabled={disabled}
      className={cn(
        'rounded-lg border bg-card text-card-foreground transition-colors',
        selected ? 'border-primary' : 'border-border',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      {...props}
    />
  )
}
