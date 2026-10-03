import type { AgentStepItem } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Workflow,
  XCircle
} from 'lucide-react'
import { useState } from 'react'

interface NodeStepperProps {
  steps: AgentStepItem[]
  isStreaming?: boolean
  className?: string
}

export function NodeStepper({ steps, isStreaming = false, className }: NodeStepperProps) {
  // Mantém sempre expandido por padrão para que as etapas de processamento fiquem sempre visíveis
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  if (steps.length === 0 && !isStreaming) return null

  // Clona os passos recebidos dinamicamente do backend
  let displaySteps = [...steps]

  // Se o streaming foi interrompido (ou a página foi recarregada) e algum passo ficou pendente ou ativo
  if (!isStreaming && displaySteps.length > 0) {
    displaySteps = displaySteps.map((s, idx) => {
      if (s.status === 'active' || s.status === 'pending') {
        return {
          ...s,
          status: 'error',
          label: idx === displaySteps.length - 1 && !s.label.includes('interromp') 
            ? `${s.label} (interrompido)` 
            : s.label
        }
      }
      return s
    })
  }

  // Se estiver em streaming e ainda não recebemos nenhum passo do backend
  if (isStreaming && displaySteps.length === 0) {
    displaySteps.push({
      step: 'initial-step',
      label: 'Iniciando raciocínio analítico...',
      status: 'active'
    })
  } else if (isStreaming && displaySteps.length > 0) {
    const lastStep = displaySteps[displaySteps.length - 1]
    if (lastStep.status === 'done') {
      displaySteps.push({
        step: 'next-pending-step',
        label: 'Carregando...',
        status: 'active'
      })
    }
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-white/10 bg-sidebar/60 shadow-lg transition-all',
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
        className="flex cursor-pointer select-none items-center justify-between border-b border-white/5 bg-[#171C25] px-3.5 py-2.5 transition-colors hover:bg-[#1D232F]"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'size-4 text-zinc-400 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
          <Workflow className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-zinc-300">
            Etapas de Processamento
          </span>

          <span className="text-[11px] text-zinc-500">
            {isExpanded ? '(clique para recolher)' : '(clique para expandir)'}
          </span>
        </div>
      </div>

      {/* Conteúdo das etapas (colapsável) */}
      {isExpanded ? (
        <div className="border-t border-white/5 bg-sidebar/40 p-3.5">
          <div className="relative space-y-3 pl-1">
            {displaySteps.map((step, index) => {
              const isDone = step.status === 'done'
              const isError = step.status === 'error'
              const isActive = step.status === 'active'
              const isLast = index === displaySteps.length - 1

              return (
                <div key={`${step.step}-${index}`} className="relative flex items-start gap-3">
                  {/* Linha vertical conectora */}
                  {!isLast ? (
                    <div
                      className={cn(
                        'absolute left-3 top-5 bottom-0 w-px -ml-px transition-colors',
                        isDone ? 'bg-emerald-500/30' : 'bg-white/10'
                      )}
                      style={{ height: 'calc(100% + 4px)' }}
                    />
                  ) : null}

                  {/* Ícone de status */}
                  <div
                    className={cn(
                      'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors',
                      isDone && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
                      isActive &&
                        'border-primary/50 bg-primary/15 text-primary shadow-[0_0_8px_rgba(255,94,43,0.3)]',
                      isError && 'border-rose-500/40 bg-rose-500/10 text-rose-400',
                      !isDone && !isActive && !isError && 'border-white/10 bg-[#1B202B] text-zinc-500'
                    )}
                  >
                    {isDone ? <CheckCircle2 className="size-3.5" /> : null}
                    {isActive ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    {isError ? <XCircle className="size-3.5" /> : null}
                    {!isDone && !isActive && !isError && <Clock className="size-3.5" />}
                  </div>

                  {/* Conteúdo do nó */}
                  <div className="flex flex-1 items-center justify-between pt-0.5">
                    <span
                      className={cn(
                        'text-xs font-medium transition-colors',
                        isDone && 'text-zinc-300',
                        isActive && 'text-primary font-semibold animate-pulse',
                        isError && 'text-rose-400',
                        !isDone && !isActive && !isError && 'text-zinc-500'
                      )}
                    >
                      {step.label}
                    </span>

                    {step.duration_ms !== undefined && step.duration_ms > 0 ? (
                      <span className="font-mono text-[10px] text-zinc-500">
                        {step.duration_ms}ms
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
