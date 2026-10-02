import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean
}

export function Card({
  className,
  selected = false,
  ref,
  ...props
}: CardProps & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card text-card-foreground transition-colors',
        selected ? 'border-primary' : 'border-border',
        className
      )}
      {...props}
    />
  )
}
