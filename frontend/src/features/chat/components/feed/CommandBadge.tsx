import { cn } from '@/lib/utils'
import type { JSX } from 'react'

/**
 * Propriedades para renderização do CommandBadge.
 */
export interface CommandBadgeProps {
  /** Nome ou token do comando (ex: '/chart', '/sql'). */
  command: string
  /** Argumentos complementares opcionais após o comando. */
  args?: string
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Renderiza um badge estilizado no padrão CLI moderno (mono, borda sutil, contraste elegante)
 * para identificar comandos de barra executados pelo usuário.
 *
 * @param props - Propriedades com nome do comando e argumentos.
 * @returns Elemento JSX do badge do comando.
 */
export function CommandBadge({ command, args, className }: CommandBadgeProps): JSX.Element {
  const normalizedCommand = command.startsWith('/') ? command : `/${command}`

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card px-2.5 py-0.5 text-xs font-mono font-medium text-foreground shadow-xs select-none',
        className
      )}
    >
      <span className="font-semibold text-primary">{normalizedCommand}</span>
      {args ? <span className="font-normal text-muted-foreground">{args}</span> : null}
    </span>
  )
}
