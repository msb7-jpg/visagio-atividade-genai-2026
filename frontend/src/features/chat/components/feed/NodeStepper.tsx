import type { AgentStepItem } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import { ChevronRight, Workflow } from 'lucide-react'
import { useState, type JSX } from 'react'
import { StepItem } from './StepItem'
import { resolveDisplaySteps } from './nodeStepperUtils'

/**
 * Propriedades para o componente de visualização das etapas de execução do agente.
 */
export interface NodeStepperProps {
  /** Lista ordenada de etapas intermediárias observadas durante a resposta. */
  steps: AgentStepItem[]
  /**
   * Indica se a resposta ainda está em geração de streaming.
   * @defaultValue `false`
   */
  isStreaming?: boolean
  /** Classes CSS adicionais para customização de layout. */
  className?: string
}

/**
 * Componente sanfonado que exibe as etapas e latências de raciocínio do pipeline do agente.
 *
 * @param props - Propriedades de configuração dos passos e estado de streaming.
 * @returns Elemento JSX colapsável da timeline ou nulo se não houver etapas.
 */
export function NodeStepper({ steps, isStreaming = false, className }: NodeStepperProps): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(true)

  if (steps.length === 0 && !isStreaming) return null

  const displaySteps = resolveDisplaySteps(steps, isStreaming)

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-sidebar shadow-lg transition-all',
        className
      )}
    >
      {/* Top bar / Collapse trigger */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Alternar exibição das etapas de processamento"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsExpanded((prev) => !prev)
          }
        }}
        className="flex cursor-pointer select-none items-center justify-between border-b border-border bg-sidebar px-3 py-2 transition-colors hover:bg-card-hover"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
          <Workflow className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Etapas de Processamento
          </span>

          <span className="text-xs text-subtle-foreground">
            {isExpanded ? '(clique para recolher)' : '(clique para expandir)'}
          </span>
        </div>
      </div>

      {/* Conteúdo das etapas (colapsável) */}
      {isExpanded ? (
        <div className="border-t border-border bg-sidebar/50 p-3">
          <div className="relative space-y-3 pl-1">
            {displaySteps.map((step, index) => (
              <StepItem
                key={`${step.step}-${index}`}
                step={step}
                isLast={index === displaySteps.length - 1}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
