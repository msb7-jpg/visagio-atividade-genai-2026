import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import type { JSX, ReactNode } from 'react'

/**
 * Propriedades para transições direcionais de swipe / slide.
 */
export interface DirectionalSlideProps {
  /** Chave única indicando a mudança de estado que deve disparar a animação. */
  activeKey: string | number
  /** Conteúdo JSX a ser renderizado na transição. */
  children: ReactNode
  /**
   * Eixo direcional do deslizamento.
   * @defaultValue 'horizontal'
   */
  direction?: 'horizontal' | 'vertical'
  /**
   * Distância do deslocamento em pixels.
   * @defaultValue 20
   */
  distance?: number
  /** Classes CSS adicionais aplicadas ao container em movimento. */
  className?: string
}

/**
 * Wrapper que gerencia transições suaves de swipe direcional com física de mola sem bloquear o ciclo de renderização.
 *
 * @param props - Propriedades de chave ativa, direção e conteúdo.
 * @returns Elemento JSX com a animação de entrada acelerada por GPU.
 */
export function DirectionalSlide({
  activeKey,
  children,
  direction = 'horizontal',
  distance = 20,
  className
}: DirectionalSlideProps): JSX.Element {
  const isHorizontal = direction === 'horizontal'

  const initial = isHorizontal
    ? { opacity: 0, x: distance }
    : { opacity: 0, y: distance }

  return (
    <motion.div
      key={activeKey}
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 28
      }}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  )
}
