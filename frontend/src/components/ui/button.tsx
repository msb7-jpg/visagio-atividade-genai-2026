import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Propriedades para estilização e interação do botão customizado do design system.
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Determina o estilo visual do botão de acordo com a prioridade da ação.
   * @defaultValue `'default'`
   */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  /**
   * Determina o tamanho físico e espaçamento interno do botão.
   * @defaultValue `'default'`
   */
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'link' | 'none'
}

/**
 * Botão base do design system encapsulando variantes visuais, tamanhos e acessibilidade.
 *
 * @param props - Propriedades de estilo, tamanho e atributos HTML nativos do botão.
 * @returns Elemento JSX do botão renderizado.
 */
export function Button({
  className,
  variant = 'default',
  size = 'default',
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }): React.JSX.Element {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer rounded-lg'

  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    secondary: 'bg-card text-foreground hover:bg-card-hover border border-border',
    outline: 'border border-border bg-transparent text-foreground hover:bg-card',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-card',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto font-normal rounded-none'
  }

  const sizes = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-11 px-8 text-base',
    icon: 'h-9 w-9',
    'icon-sm': 'h-7 w-7',
    link: 'h-auto p-0 text-xs',
    none: 'h-auto p-0'
  }

  const resolvedSize = variant === 'link' && size === 'default' ? sizes.link : sizes[size]

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], resolvedSize, className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  )
}
