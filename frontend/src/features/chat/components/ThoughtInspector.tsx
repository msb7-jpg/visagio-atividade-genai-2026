import { useState } from 'react'
import { Brain, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThoughtInspectorProps {
  thought: string
  className?: string
}

export function ThoughtInspector({ thought, className }: ThoughtInspectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!thought) return null

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-white/10 bg-[#13171E]/60 shadow-lg transition-all',
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
        className="flex cursor-pointer select-none items-center justify-between border-b border-white/5 bg-[#171C25] px-3.5 py-2.5 transition-colors hover:bg-[#1D232F]"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'size-4 text-zinc-400 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
          <Brain className="size-3.5 text-[#FF5E2B]" />
          <span className="text-xs font-semibold text-zinc-300">
            Raciocínio do Agente
          </span>
          <span className="text-[11px] text-zinc-500">
            {isOpen ? '(clique para recolher)' : '(clique para expandir)'}
          </span>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-white/5 bg-[#13171E]/40 p-3.5 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {thought}
        </div>
      ) : null}
    </div>
  )
}

