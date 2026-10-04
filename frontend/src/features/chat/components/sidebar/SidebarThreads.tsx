import { Button } from '@/components/ui/button'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import { Loader2, Trash2 } from 'lucide-react'

/**
 * Propriedades para renderização da lista de conversas salvas na barra lateral.
 */
export interface SidebarThreadsProps {
  /** Lista de resumos das conversas salvas. */
  threads: ThreadSummary[]
  /** Identificador da thread ativa no momento ou nulo. */
  activeThreadId: string | null
  /** Identificador da thread que está com streaming ativo em segundo plano. */
  streamingThreadId?: string | null
  /** Callback executado ao clicar em uma thread para carregá-la. */
  onSelectThread: (threadId: string) => void
  /** Callback para iniciar uma nova conversa vazia. */
  onNewChat?: () => void
  /** Callback para exclusão da thread. */
  onDeleteThread: (threadId: string) => void
  /**
   * Flag indicando exclusão em andamento.
   * @defaultValue `false`
   */
  isDeleting?: boolean
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Lista lateral de histórico de conversas com seleção ativa, indicador de streaming e botão de exclusão.
 *
 * @param props - Propriedades contendo threads, callbacks e IDs ativos.
 * @returns Elemento JSX com a lista de threads formatada.
 */
export function SidebarThreads({
  threads,
  activeThreadId,
  streamingThreadId = null,
  onSelectThread,
  onDeleteThread,
  isDeleting = false,
  className
}: SidebarThreadsProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="space-y-1">
        <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
          Histórico
        </div>

        {threads.length === 0 ? (
          <div className="px-2 py-3 text-xs text-subtle-foreground italic">
            Nenhuma conversa salva
          </div>
        ) : (
          <div className="space-y-0.5 overflow-y-auto max-h-96">
            {threads.map((thread) => {
              const isActive = activeThreadId === thread.thread_id
              const isThreadStreaming = streamingThreadId === thread.thread_id

              return (
                <div
                  key={thread.thread_id}
                  onClick={() => onSelectThread(thread.thread_id)}
                  className={cn(
                    'group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/15 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-card-hover hover:text-foreground'
                  )}
                >
                  <div className="flex flex-1 items-center gap-3 overflow-hidden text-left min-w-0">
                    {isThreadStreaming ? (
                      <Loader2
                        aria-label="Gerando resposta"
                        className="h-4 w-4 shrink-0 animate-spin text-primary"
                      />
                    ) : null}
                    <span className="truncate">{thread.title}</span>
                  </div>

                  {isThreadStreaming ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isDeleting}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDeleteThread(thread.thread_id)
                      }}
                      title="Excluir conversa"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
