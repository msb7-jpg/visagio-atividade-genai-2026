import { useMotionValue, useSpring } from 'motion/react'
import type React from 'react'
import { useCallback, useState } from 'react'

interface PointerSpringPositionOptions {
  cardWidth?: number
  cardHeight?: number
  offsetX?: number
  offsetY?: number
}

/**
 * Hook headless para física suave de ponteiro com prevenção inteligente de colisão de tela (clamping).
 *
 * @param options - Dimensões estimadas e offsets do card.
 */
export function usePointerSpringPosition(options: PointerSpringPositionOptions = {}) {
  const {
    cardWidth = 340,
    cardHeight = 360,
    offsetX = 16,
    offsetY = 16
  } = options

  const [isVisible, setIsVisible] = useState(false)
  const [placement, setPlacement] = useState<{ xAlign: 'left' | 'right'; yAlign: 'top' | 'bottom' }>({
    xAlign: 'left',
    yAlign: 'top'
  })

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  // Configuração de mola fluida e responsiva
  const springX = useSpring(rawX, { stiffness: 260, damping: 24, mass: 0.6 })
  const springY = useSpring(rawY, { stiffness: 260, damping: 24, mass: 0.6 })

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const clientX = event.clientX
    const clientY = event.clientY
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800

    const exceedsRight = clientX + cardWidth + offsetX > windowWidth - 16
    const exceedsBottom = clientY + cardHeight + offsetY > windowHeight - 16

    const xAlign = exceedsRight ? 'right' : 'left'
    const yAlign = exceedsBottom ? 'bottom' : 'top'
    setPlacement({ xAlign, yAlign })

    // Determina a posição ancorada respeitando a margem da janela
    const targetX = exceedsRight
      ? Math.max(16, clientX - cardWidth - offsetX)
      : Math.min(windowWidth - cardWidth - 16, clientX + offsetX)

    const targetY = exceedsBottom
      ? Math.max(16, clientY - cardHeight - offsetY)
      : Math.min(windowHeight - cardHeight - 16, clientY + offsetY)

    rawX.set(targetX)
    rawY.set(targetY)
    return { targetX, targetY }
  }, [cardWidth, cardHeight, offsetX, offsetY, rawX, rawY])

  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    const { targetX, targetY } = handleMouseMove(event)
    // Inicializa a mola diretamente na posição do cursor para evitar deslizar do (0, 0)
    springX.jump(targetX)
    springY.jump(targetY)
    setIsVisible(true)
  }, [handleMouseMove, springX, springY])

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false)
  }, [])

  return {
    isVisible,
    placement,
    springX,
    springY,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave
  }
}
