import { STEP_STATUS, type AgentStepItem } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import type { JSX } from 'react'

/**
 * Propriedades para renderização de um item individual da linha do tempo do agente.
 */
export interface StepItemProps {
  /** Metadados da etapa com identificador, rótulo, status e duração. */
  step: AgentStepItem
  /** Se `true`, indica que este é o último passo da lista, ocultando a linha conectora inferior. */
  isLast: boolean
}

/**
 * Item visual representando uma etapa atômica de raciocínio ou execução do agente.
 *
 * @param props - Propriedades contendo o passo e flag de último elemento.
 * @returns Elemento JSX do passo com ícones de estado e tempo de execução.
 */
export function StepItem({ step, isLast }: StepItemProps): JSX.Element {
  const isDone = step.status === STEP_STATUS.DONE
  const isError = step.status === STEP_STATUS.ERROR
  const isActive = step.status === STEP_STATUS.ACTIVE

  return (
    <div className="relative flex items-start gap-3">
      {/* Linha vertical conectora */}
      {!isLast ? (
        <div
          className={cn(
            'absolute left-3 top-5 bottom-0 w-px -ml-px transition-colors h-full',
            isDone ? 'bg-accent-emerald/30' : 'bg-border'
          )}
        />
      ) : null}

      {/* Ícone de status */}
      <div
        className={cn(
          'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors',
          isDone && 'border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald',
          isActive && 'border-primary/50 bg-primary/15 text-primary shadow-sm shadow-primary/20',
          isError && 'border-destructive/40 bg-destructive/10 text-destructive',
          !isDone && !isActive && !isError && 'border-border bg-card text-subtle-foreground'
        )}
      >
        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
        {isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {isError ? <XCircle className="h-3.5 w-3.5" /> : null}
        {!isDone && !isActive && !isError && <Clock className="h-3.5 w-3.5" />}
      </div>

      {/* Conteúdo do nó */}
      <div className="flex flex-1 items-center justify-between pt-0.5">
        <span
          className={cn(
            'text-xs font-medium transition-colors',
            isDone && 'text-foreground',
            isActive && 'text-primary font-semibold animate-pulse',
            isError && 'text-destructive',
            !isDone && !isActive && !isError && 'text-subtle-foreground'
          )}
        >
          {step.label}
        </span>

        {step.duration_ms !== undefined && step.duration_ms > 0 ? (
          <span className="font-mono text-xs text-subtle-foreground">
            {step.duration_ms}ms
          </span>
        ) : null}
      </div>
    </div>
  )
}
