import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  status?: 'default' | 'success' | 'error'
}

export function Input({
  className,
  type = 'text',
  status = 'default',
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const statusStyles = {
    default: 'border-border bg-card focus-visible:border-primary',
    success: 'border-accent-emerald bg-card focus-visible:border-accent-emerald text-foreground',
    error: 'border-primary bg-card focus-visible:border-primary text-foreground'
  }

  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border px-3 py-1 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 font-mono',
        statusStyles[status],
        className
      )}
      data-status={status}
      {...props}
    />
  )
}
