import { Button } from '@/components/ui/button'
import type { SlashCommandItem } from '@/features/chat/components/input/useSlashCommandsController'
import { cn } from '@/lib/utils'

/**
 * Propriedades para renderização do menu popover de comandos de barra.
 */
export interface SlashCommandMenuProps {
  /** Lista de comandos filtrados para exibição. */
  commands: SlashCommandItem[]
  /** Índice do comando selecionado para navegação via teclado. */
  selectedIndex: number
  /** Callback para registro do elemento de botão do menu para rolagem automática. */
  onRegisterItemRef: (index: number, element: HTMLButtonElement | null) => void
  /** Callback acionado ao selecionar um comando. */
  onSelectCommand: (commandName: string) => void
  /** Callback acionado ao posicionar o cursor sobre um item. */
  onHoverIndex: (index: number) => void
}

/**
 * Menu suspenso com a lista de comandos de barra (slash commands) com navegação por setas e Enter.
 *
 * @param props - Propriedades de comandos, seleção e callbacks.
 * @returns Elemento JSX do menu flutuante.
 */
export function SlashCommandMenu({
  commands,
  selectedIndex,
  onRegisterItemRef,
  onSelectCommand,
  onHoverIndex
}: SlashCommandMenuProps) {
  return (
    <div
      data-testid="slash-command-menu"
      className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 z-50"
    >
      <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
        Comandos Rápidos
      </div>
      <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
        {commands.map((cmd, idx) => {
          const Icon = cmd.icon
          const isSelected = idx === selectedIndex
          return (
            <Button
              key={cmd.name}
              ref={(element) => {
                onRegisterItemRef(idx, element)
              }}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectCommand(cmd.name)}
              onMouseEnter={() => onHoverIndex(idx)}
              className={cn(
                'flex w-full items-center justify-start gap-2.5 h-auto rounded-lg px-2.5 py-2 text-left text-xs font-normal whitespace-normal transition-colors cursor-pointer',
                isSelected
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-foreground hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-md border',
                  isSelected
                    ? 'border-primary/30 bg-primary/20 text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-mono font-semibold">{cmd.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {cmd.description}
                </span>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
