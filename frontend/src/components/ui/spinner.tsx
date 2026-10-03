import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

/**
 * Propriedades para estilização e dimensionamento do ícone de carregamento rotativo.
 */
export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Cor temática do indicador.
   * @defaultValue `'primary'`
   */
  variant?: 'default' | 'primary' | 'muted'
  /**
   * Tamanho físico do ícone.
   * @defaultValue `'default'`
   */
  size?: 'default' | 'sm' | 'lg'
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Indicador animado de carregamento com giro contínuo do design system.
 *
 * @param props - Propriedades de variante, tamanho e atributos SVG nativos.
 * @returns Elemento JSX do ícone SVG girando.
 */
export function Spinner({
  variant = 'primary',
  size = 'default',
  className,
  ...props
}: SpinnerProps): React.JSX.Element {
  const variants = {
    default: 'text-foreground',
    primary: 'text-primary',
    muted: 'text-muted-foreground'
  }
  const sizes = {
    default: 'h-4 w-4',
    sm: 'h-3.5 w-3.5',
    lg: 'h-6 w-6'
  }

  return (
    <Loader2
      className={cn('animate-spin shrink-0', variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
