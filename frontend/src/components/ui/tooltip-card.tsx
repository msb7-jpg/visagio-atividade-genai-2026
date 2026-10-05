'use client'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function clampDimension(cursor: number, size: number, maxViewport: number, padding = 12): number {
  let pos = cursor + padding
  if (pos + size > maxViewport - padding) {
    pos = cursor - size - padding
  }
  return Math.max(padding, pos)
}

function computeClampedTooltipPosition(
  viewportX: number,
  viewportY: number,
  tooltipWidth: number,
  tooltipHeight: number
): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x: viewportX + 12, y: viewportY + 12 }
  }
  return {
    x: clampDimension(viewportX, tooltipWidth, window.innerWidth),
    y: clampDimension(viewportY, tooltipHeight, window.innerHeight)
  }
}

export const Tooltip = ({
  content,
  children,
  containerClassName,
  tooltipClassName
}: {
  content: string | React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
  tooltipClassName?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [height, setHeight] = useState(0)
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0
  })
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [isVisible, content])

  const calculatePosition = React.useCallback((viewportX: number, viewportY: number) => {
    const tooltipWidth = contentRef.current?.offsetWidth || 340
    const tooltipHeight = contentRef.current?.offsetHeight || height || 60
    return computeClampedTooltipPosition(viewportX, viewportY, tooltipWidth, tooltipHeight)
  }, [height])

  const updateMousePosition = (clientX: number, clientY: number) => {
    setMouse({ x: clientX, y: clientY })
    const newPosition = calculatePosition(clientX, clientY)
    setPosition(newPosition)
  }

  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsVisible(true)
    updateMousePosition(event.clientX, event.clientY)
  }

  const handleMouseLeave = () => {
    setMouse({ x: 0, y: 0 })
    setPosition({ x: 0, y: 0 })
    setIsVisible(false)
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isVisible) return
    updateMousePosition(event.clientX, event.clientY)
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    updateMousePosition(touch.clientX, touch.clientY)
    setIsVisible(true)
  }

  const handleTouchEnd = () => {
    // Delay hiding to allow for tap interaction
    setTimeout(() => {
      setIsVisible(false)
      setMouse({ x: 0, y: 0 })
      setPosition({ x: 0, y: 0 })
    }, 2000)
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Toggle visibility on click for mobile devices
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches) {
      event.preventDefault()
      if (isVisible) {
        setIsVisible(false)
        setMouse({ x: 0, y: 0 })
        setPosition({ x: 0, y: 0 })
      } else {
        updateMousePosition(event.clientX, event.clientY)
        setIsVisible(true)
      }
    }
  }

  // Update position when tooltip becomes visible or content changes
  useEffect(() => {
    if (isVisible) {
      const newPosition = calculatePosition(mouse.x, mouse.y)
      setPosition(newPosition)
    }
  }, [isVisible, mouse.x, mouse.y, calculatePosition])

  const renderTooltipContent = () => {
    if (typeof document === 'undefined') return null

    return createPortal(
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key={String(isVisible)}
            initial={{ height: 0, opacity: 1 }}
            animate={{ height, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20
            }}
            className={cn(
              'pointer-events-none fixed z-[100] w-auto max-w-[360px] overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl ring-1 ring-border/20',
              tooltipClassName
            )}
            style={{
              top: `${position.y}px`,
              left: `${position.x}px`
            }}
          >
            <div
              ref={contentRef}
              className="p-0 text-foreground"
            >
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block', containerClassName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {children}
      {renderTooltipContent()}
    </div>
  )
}
