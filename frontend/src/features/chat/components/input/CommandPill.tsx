import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

/**
 * Propriedades do indicador de comando de barra ativo.
 */
export interface CommandPillProps {
  /** Nome identificador do comando (ex: /chart). */
  command: string
  /** Callback acionado ao remover o comando ativo. */
  onRemove: () => void
}

/**
 * Tag visual com estilo destacado indicando o comando de barra prefixado atualmente no input.
 *
 * @param props - Propriedades de comando e remoção.
 * @returns Elemento JSX da pill com botão de fechar.
 */
export function CommandPill({ command, onRemove }: CommandPillProps) {
  return (
    <div
      data-testid="input-command-pill"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/20 px-3 py-1 text-xs font-mono font-semibold text-primary shrink-0 select-none shadow-xs animate-in fade-in zoom-in-95"
    >
      <span>{command}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Remover comando ${command}`}
        className="h-4 w-4 rounded-full p-0 text-primary/70 hover:text-primary hover:bg-primary/30 transition-colors"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
