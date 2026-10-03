import { cn } from '@/lib/utils';
import { Navigation } from 'lucide-react';

export interface TimelineScrollSpyProps {
  items: { id: string; title: string }[]
  activeId: string | null
  onSelectItem: (id: string) => void
  isOpen?: boolean
  className?: string
}

export function TimelineScrollSpy({
  items,
  activeId,
  onSelectItem,
  className
}: TimelineScrollSpyProps) {
  if (items.length === 0) {
    return (
      <div
        data-testid="timeline-scroll-spy"
        className={cn('flex flex-col h-full w-full', className)}
      >
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <Navigation className="size-3.5 text-primary" />
          <span>Turnos da Conversa</span>
        </div>
        <div className="p-4 text-xs text-muted-foreground italic">
          Nenhuma pergunta enviada ainda
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="timeline-scroll-spy"
      className={cn('flex flex-col h-full w-full', className)}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
        <Navigation className="size-3.5 text-muted-foreground" />
        <span>Turnos da Conversa</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map((item) => {
          const isActive = activeId === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item.id)}
              className={cn(
                'group flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              )}
            >

              <span className="truncate leading-relaxed">
                {item.title}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
