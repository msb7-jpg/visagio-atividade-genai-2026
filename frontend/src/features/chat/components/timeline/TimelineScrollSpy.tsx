import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Navigation, PanelRightClose } from 'lucide-react'

/**
 * Propriedades para a barra de navegação rápida por turnos da conversa.
 */
export interface TimelineScrollSpyProps {
  /** Itens dos turnos do chat contendo identificador HTML e resumo da pergunta. */
  items: { id: string; title: string }[]
  /** Identificador do turno atualmente visível na tela. */
  activeId: string | null
  /** Callback para rolar suavemente até o turno clicado. */
  onSelectItem: (id: string) => void
  /** Callback para recolher a barra lateral da timeline. */
  onCollapse?: () => void
  /** Se `true`, indica que o painel lateral está visível. */
  isOpen?: boolean
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Linha do tempo interativa exibindo os turnos do diálogo e destacando a pergunta atualmente em visualização.
 *
 * @param props - Propriedades contendo itens da conversa e callbacks de seleção.
 * @returns Elemento JSX da timeline vertical com links diretos de navegação.
 */
export function TimelineScrollSpy({
  items,
  activeId,
  onSelectItem,
  onCollapse,
  className
}: TimelineScrollSpyProps) {
  if (items.length === 0) {
    return (
      <div
        data-testid="timeline-scroll-spy"
        className={cn('flex flex-col h-full w-full', className)}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span>Turnos da Conversa</span>
          </div>
          {onCollapse ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCollapse}
              aria-label="Recolher turnos da conversa"
              title="Recolher histórico de turnos"
              className="h-6 w-6"
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </Button>
          ) : null}
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
      <div className="flex items-center justify-between px-3 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
        <div className="flex items-center gap-2">
          <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Turnos da Conversa</span>
        </div>
        {onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            aria-label="Recolher turnos da conversa"
            title="Recolher histórico de turnos"
            className="h-6 w-6"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map((item) => {
          const isActive = activeId === item.id

          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectItem(item.id)}
              className={cn(
                'group flex w-full justify-start items-center h-auto rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-card-hover hover:text-foreground'
              )}
            >
              <span className="truncate leading-relaxed">
                {item.title}
              </span>
            </Button>
          )
        })}
      </nav>
    </div>
  )
}
