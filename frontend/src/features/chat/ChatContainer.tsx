import { AmbientGlow } from '@/components/animations'
import { Button } from '@/components/ui/button'
import { SuggestionsExplorer } from '@/features/chat/components/empty-state/SuggestionsExplorer'
import { ChatInput } from '@/features/chat/components/input/ChatInput'
import { useChatSync } from '@/features/chat/hooks/useChatSync'
import type { UseAgentStreamResult } from '@/features/chat/hooks/useAgentStream'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ChatMessage } from './components/feed/ChatMessage'

/**
 * Propriedades para renderização do container principal de chat.
 */
export interface ChatContainerProps {
  /** Objeto consolidado do hook useAgentStream em nível de aplicação. */
  stream: UseAgentStreamResult
  /** Callback para abertura do modal de configurações de IA. */
  onOpenSettings: () => void
  /** Callback para sincronização do título ativo no cabeçalho. */
  onTitleChange?: (title: string | null) => void
  /** Callback executado quando uma nova thread é criada no backend. */
  onActiveThreadChange?: (threadId: string | null) => void
  /** Callback para propagação dos turnos da conversa à timeline lateral. */
  onTimelineItemsChange?: (items: { id: string; title: string }[]) => void
  /** Callback para navegar à conversa que está gerando resposta em background. */
  onGoToStreamingThread?: () => void
  /** Callback para iniciar uma nova conversa vazia. */
  onNewChat?: () => void
  /** Identificador opcional da conversa consultada via URL. */
  externalThreadId?: string | null
  /** Classes CSS adicionais. */
  className?: string
}

interface ChatEmptyWelcomeProps {
  isModelLocked: boolean
  onSelectPrompt: (prompt: string) => void
}

function ChatEmptyWelcome({ isModelLocked, onSelectPrompt }: ChatEmptyWelcomeProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-12 text-center sm:py-20 animate-fade-in">
      <AmbientGlow size="lg" />

      <h2 className="relative z-10 mt-5 text-xl font-bold text-foreground">
        Bem-vindo ao CineData Analytics!
      </h2>
      <p className="relative z-10 mt-2 max-w-md text-sm text-muted-foreground">
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
        <SuggestionsExplorer onSelectPrompt={onSelectPrompt} />
      </div>
    </div>
  )
}

interface ChatLockBannerProps {
  isLockedByOtherThread: boolean
  isRunningRemotely: boolean
  onGoToStreamingThread?: () => void
}

function ChatLockBanner({
  isLockedByOtherThread,
  isRunningRemotely,
  onGoToStreamingThread
}: ChatLockBannerProps) {
  if (!isLockedByOtherThread && !isRunningRemotely) return null

  return (
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
  )
}

/**
 * Container principal do feed de conversa, orquestrando histórico reidratado e novos envios.
 */
export function ChatContainer({
  stream,
  onOpenSettings,
  onTitleChange,
  onActiveThreadChange,
  onTimelineItemsChange,
  onGoToStreamingThread,
  onNewChat,
  externalThreadId,
  className
}: ChatContainerProps) {
  const {
    messages,
    isModelLocked,
    isLockedByOtherThread,
    isRunningRemotely,
    messagesEndRef,
    handleSend: rawHandleSend,
    handleRetry
  } = useChatSync({
    stream,
    externalThreadId,
    onTitleChange,
    onActiveThreadChange,
    onTimelineItemsChange
  })

  const handleSend = (text: string) => {
    if (text.trim() === '/clear') {
      onNewChat?.()
      return
    }
    rawHandleSend(text)
  }

  return (
    <div className={cn('relative flex h-full flex-col bg-background', className)}>
      <div
        data-chat-scroll-container
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <ChatEmptyWelcome
              isModelLocked={isModelLocked}
              onSelectPrompt={handleSend}
            />
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOpenSettings={onOpenSettings}
                onRetry={() => handleRetry(msg.id)}
                onGenerateChart={() => handleSend('/chart Gere um gráfico para a análise acima')}
                actionsDisabled={isModelLocked}
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-background/80 p-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-4xl space-y-2">
          <ChatLockBanner
            isLockedByOtherThread={isLockedByOtherThread}
            isRunningRemotely={isRunningRemotely}
            onGoToStreamingThread={onGoToStreamingThread}
          />
          <ChatInput
            onSendMessage={handleSend}
            onAbortStream={stream.abortStream}
            isStreaming={stream.isStreaming}
            disabled={isModelLocked}
          />
        </div>
      </div>
    </div>
  )
}
