import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import type { JSX, ReactNode } from 'react'

/**
 * Propriedades para o container sanfonado com animação elástica de altura.
 */
export interface CollapsibleMotionProps {
  /** Flag booleana controlando se o container está expandido ou recolhido. */
  isExpanded: boolean
  /** Conteúdo JSX interno do container sanfonado. */
  children: ReactNode
  /** Classes CSS adicionais para o container. */
  className?: string
}

/**
 * Container que gerencia a expansão e o recolhimento com transição física contínua de altura.
 *
 * @param props - Propriedades de expansão e conteúdo.
 * @returns Elemento JSX com animação de altura controlada pelo Motion.
 */
export function CollapsibleMotion({
  isExpanded,
  children,
  className
}: CollapsibleMotionProps): JSX.Element {
  return (
    <motion.div
      data-testid="collapsible-motion"
      initial={false}
      animate={{
        height: isExpanded ? 'auto' : 0,
        opacity: isExpanded ? 1 : 0
      }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 26
      }}
      className={cn('overflow-hidden', className)}
    >
      {isExpanded ? children : null}
    </motion.div>
  )
}
