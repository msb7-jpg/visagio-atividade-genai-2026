import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import type { JSX } from 'react'

/**
 * Propriedades para a aura luminosa ambiental.
 */
export interface AmbientGlowProps {
  /**
   * Tamanho relativo da aura de iluminação.
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Duração de um ciclo completo de respiração em segundos.
   * @defaultValue 6
   */
  duration?: number
  /** Classes CSS adicionais para posicionamento ou ajustes de opacidade. */
  className?: string
}

const SIZE_VARIANTS = {
  sm: 'size-72',
  md: 'size-96 sm:size-[500px]',
  lg: 'size-[500px] sm:size-[700px]'
}

/**
 * Aura radial cinematográfica com efeito contínuo de respiração física e desfoque profundo.
 *
 * @param props - Propriedades de tamanho, duração e customização de classes.
 * @returns Elemento JSX com a camada luminosa acelerada por hardware.
 */
export function AmbientGlow({
  size = 'md',
  duration = 6,
  className
}: AmbientGlowProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-testid="ambient-glow"
      className={cn(
        'pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 select-none overflow-visible',
        className
      )}
    >
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.55, 0.85, 0.55]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className={cn(
          'rounded-full blur-3xl cinedata-ambient-glow',
          SIZE_VARIANTS[size]
        )}
      />
    </div>
  )
}
