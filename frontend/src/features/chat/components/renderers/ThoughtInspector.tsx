import { CollapsibleMotion } from '@/components/animations'
import { cn } from '@/lib/utils'
import { Brain, ChevronRight } from 'lucide-react'
import { useState } from 'react'

/**
 * Propriedades para renderização do inspetor de pensamento do agente.
 */
export interface ThoughtInspectorProps {
  /** Texto contendo os pensamentos internos emitidos pelo modelo. */
  thought: string
  /** Classes CSS adicionais para o container. */
  className?: string
}

/**
 * Componente sanfonado que oculta ou revela as reflexões e planejamento do modelo (bloco <thought>).
 *
 * @param props - Propriedades com o texto do pensamento e classes de estilização.
 * @returns Elemento JSX colapsável ou nulo se o pensamento for vazio.
 */
export function ThoughtInspector({ thought, className }: ThoughtInspectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!thought) return null

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-sidebar shadow-lg transition-all',
        className
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Alternar exibição do raciocínio interno do agente"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsOpen((prev) => !prev)
          }
        }}
        className="flex cursor-pointer select-none items-center justify-between border-b border-border bg-sidebar px-3 py-2 transition-colors hover:bg-card-hover"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Raciocínio do Agente
          </span>
          <span className="text-xs text-subtle-foreground">
            {isOpen ? '(clique para recolher)' : '(clique para expandir)'}
          </span>
        </div>
      </div>

      <CollapsibleMotion isExpanded={isOpen}>
        <div className="border-t border-border bg-sidebar/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {thought}
        </div>
      </CollapsibleMotion>
    </div>
  )
}
