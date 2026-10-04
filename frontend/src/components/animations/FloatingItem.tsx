import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import type { JSX, ReactNode } from 'react'

/**
 * Propriedades para o wrapper de levitação física periódica.
 */
export interface FloatingItemProps {
  /** Elemento JSX filho que receberá a levitação suave. */
  children: ReactNode
  /**
   * Amplitude do deslocamento vertical em pixels.
   * @defaultValue 5
   */
  amplitude?: number
  /**
   * Duração de um ciclo completo de subida e descida em segundos.
   * @defaultValue 4
   */
  duration?: number
  /** Classes CSS adicionais para o container. */
  className?: string
}

/**
 * Envelopa qualquer elemento em uma levitação física harmônica contínua sem quebrar o layout.
 *
 * @param props - Propriedades de conteúdo, amplitude e velocidade do ciclo.
 * @returns Elemento JSX com a translação vertical animada.
 */
export function FloatingItem({
  children,
  amplitude = 5,
  duration = 4,
  className
}: FloatingItemProps): JSX.Element {
  return (
    <motion.div
      data-testid="floating-item"
      animate={{
        y: [0, -amplitude, 0]
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={cn('inline-flex', className)}
    >
      {children}
    </motion.div>
  )
}
