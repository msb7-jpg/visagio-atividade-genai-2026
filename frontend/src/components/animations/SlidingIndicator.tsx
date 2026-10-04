import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import type { JSX } from 'react'

/**
 * Propriedades para o indicador deslizante com sincronização de layout.
 */
export interface SlidingIndicatorProps {
  /** Identificador único do layout compartilhado do Motion (layoutId). */
  layoutId: string
  /** Classes CSS adicionais para customização de cores, bordas ou halos. */
  className?: string
}

/**
 * Elemento de destaque físico que desliza organicamente entre elementos ativos irmãos utilizando layoutId.
 *
 * @param props - Propriedades contendo o layoutId único e estilos adicionais.
 * @returns Elemento JSX animado pelo motor de layout do Motion.
 */
export function SlidingIndicator({
  layoutId,
  className
}: SlidingIndicatorProps): JSX.Element {
  return (
    <motion.div
      layoutId={layoutId}
      aria-hidden="true"
      data-testid="sliding-indicator"
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 30
      }}
      className={cn(
        'pointer-events-none absolute inset-0 z-0 rounded-lg',
        className
      )}
    />
  )
}
