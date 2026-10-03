import { Button } from '@/components/ui/button'
import { SuggestionExplorer } from '@/features/chat/components/empty-state/SuggestionsExplorer'
import { ChatMessage } from '@/features/chat/components/feed/ChatMessage'
import { ChatInput } from '@/features/chat/components/input/ChatInput'
import type { AgentStream } from '@/features/chat/hooks/useAgentStream'
import { useChatSync } from '@/features/chat/hooks/useChatSync'
import { cn } from '@/lib/utils'
import { Clapperboard, Loader2 } from 'lucide-react'

/**
 * Propriedades para o container principal da interface de chat.
 */
export interface ChatContainerProps {
  /** Stream compartilhado em nível de aplicação (sobrevive à navegação entre threads). */
  stream: AgentStream
  /** Callback para abertura do painel de configurações. */
  onOpenSettings?: () => void
  /** Callback notificado quando o título da conversa ativa for alterado. */
  onTitleChange?: (title: string | null) => void
  /** Callback para sincronização da thread ativa com a URL. */
  onActiveThreadChange?: (threadId: string | null) => void
  /** Callback que repassa os itens da timeline para navegação rápida. */
  onTimelineItemsChange?: (items: { id: string; title: string }[]) => void
  /** Navega de volta para a thread que está gerando resposta. */
  onGoToStreamingThread?: () => void
  /** Identificador de thread externa injetado via rota. */
  externalThreadId?: string | null
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Container principal do chat analítico contendo feed de mensagens, estado vazio com sugestões e input fixo.
 *
 * @param props - Propriedades contendo stream global e callbacks de sincronização.
 * @returns Elemento JSX completo da interface de conversa.
 */
export function ChatContainer({
  stream,
  onOpenSettings,
  onTitleChange,
  onActiveThreadChange,
  onTimelineItemsChange,
  onGoToStreamingThread,
  externalThreadId,
  className
}: ChatContainerProps) {
  const {
    messages,
    isModelLocked,
    isLockedByOtherThread,
    isRunningRemotely,
    messagesEndRef,
    handleSend,
    handleRetry
  } = useChatSync({
    stream,
    externalThreadId,
    onTitleChange,
    onActiveThreadChange,
    onTimelineItemsChange
  })

  return (
    <div className={cn('relative flex h-full flex-col bg-background', className)}>
      <div
        data-chat-scroll-container
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center sm:py-20 animate-fade-in">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-sidebar shadow-xl">
                <Clapperboard className="size-7 text-primary" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-foreground">
                CineData Analytics Intelligence
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Consulte bilheterias, diretores, atores, lucros médios e estatísticas do
                catálogo de cinema em linguagem natural com validação SQL em tempo real.
              </p>

              <div
                className={cn(
                  'mt-8 flex flex-wrap justify-center gap-2',
                  isModelLocked && 'pointer-events-none opacity-50'
                )}
                aria-disabled={isModelLocked}
              >
                <SuggestionExplorer onSelectPrompt={handleSend} />
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOpenSettings={onOpenSettings}
                onRetry={() => handleRetry(msg.id)}
                actionsDisabled={isModelLocked}
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input de envio fixo no rodapé */}
      <div className="border-t border-border bg-background/80 p-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-4xl space-y-2">
          {isLockedByOtherThread || isRunningRemotely ? (
            <Button
              type="button"
              variant="outline"
              onClick={isLockedByOtherThread ? onGoToStreamingThread : undefined}
              className="flex w-full items-center justify-start gap-2 h-auto rounded-xl border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10 whitespace-normal"
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
              <span>
                {isLockedByOtherThread
                  ? 'Aguarde a resposta em curso para enviar uma nova mensagem.'
                  : 'Esta conversa ainda está sendo processada. A resposta aparecerá aqui ao concluir.'}
              </span>
            </Button>
          ) : null}
          <ChatInput onSendMessage={handleSend} isStreaming={isModelLocked} />
        </div>
      </div>
    </div>
  )
}
export default ChatContainer
