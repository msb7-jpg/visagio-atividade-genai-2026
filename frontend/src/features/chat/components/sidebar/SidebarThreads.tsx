import { Button } from '@/components/ui/button'
import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import { Loader2, MessageSquare, Trash2 } from 'lucide-react'

export interface SidebarThreadsProps {
  threads: ThreadSummary[]
  activeThreadId: string | null
  /** Thread cuja resposta está sendo gerada no momento (exibe spinner) */
  streamingThreadId?: string | null
  onSelectThread: (threadId: string) => void
  onNewChat?: () => void
  onDeleteThread: (threadId: string) => void
  isDeleting?: boolean
  className?: string
}

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
        <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Histórico
        </div>

        {threads.length === 0 ? (
          <div className="px-2 py-3 text-xs text-zinc-500 italic">
            Nenhuma conversa salva
          </div>
        ) : (
          <div className="space-y-0.5 overflow-y-auto max-h-[50vh]">
            {threads.map((thread) => {
              const isActive = activeThreadId === thread.thread_id
              const isThreadStreaming = streamingThreadId === thread.thread_id

              return (
                <div
                  key={thread.thread_id}
                  onClick={() => onSelectThread(thread.thread_id)}
                  className={cn(
                    'group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors',
                    isActive
                      ? 'bg-primary/15 text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  )}
                >
                  <div className="flex flex-1 items-center gap-2 overflow-hidden text-left min-w-0">
                    {isThreadStreaming ? (
                      <Loader2
                        aria-label="Gerando resposta"
                        className="size-3.5 shrink-0 animate-spin text-primary"
                      />
                    ) : (
                      <MessageSquare
                        className={cn(
                          'size-3.5 shrink-0',
                          isActive ? 'text-primary' : 'text-zinc-500'
                        )}
                      />
                    )}
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
                      className="size-7 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
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
