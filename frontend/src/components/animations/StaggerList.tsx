import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import type { JSX, ReactNode } from 'react'

/**
 * Propriedades para um item animado de lista com entrada em cascata.
 */
export interface StaggerItemProps {
  /** Conteúdo JSX do item. */
  children: ReactNode
  /**
   * Tempo de atraso opcional em segundos antes da animação.
   * @defaultValue 0
   */
  delay?: number
  /** Classes CSS adicionais para o container do item. */
  className?: string
}

/**
 * Item individual com animação suave de fade e deslocamento horizontal.
 *
 * @param props - Propriedades contendo o conteúdo, atraso e classes.
 * @returns Elemento JSX com animação de entrada acelerada por GPU.
 */
export function StaggerItem({
  children,
  delay = 0,
  className
}: StaggerItemProps): JSX.Element {
  return (
    <motion.div
      data-testid="stagger-item"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 28,
        delay
      }}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  )
}
