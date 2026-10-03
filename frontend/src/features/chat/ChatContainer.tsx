import { useThreadDetailQuery } from '@/features/chat/hooks/useThreadDetailQuery'
import type { ChatMessageBlock, ChatMessageItem, ThreadDetail } from '@/features/chat/types/chat.types'
import { useProviderConfigQuery } from '@/features/settings/hooks/useProviderConfigQuery'
import { cn } from '@/lib/utils'
import { Clapperboard, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { ChatMessage } from './components/feed/ChatMessage'
import { ChatInput } from './components/input/ChatInput'
import type { AgentStream } from './hooks/useAgentStream'
import { SuggestionExplorer } from './SuggestionsExplorer'

export interface ChatContainerProps {
  /** Stream compartilhado em nível de aplicação (sobrevive à navegação entre threads) */
  stream: AgentStream
  onOpenSettings?: () => void
  onTitleChange?: (title: string | null) => void
  onActiveThreadChange?: (threadId: string | null) => void
  onTimelineItemsChange?: (items: { id: string; title: string }[]) => void
  /** Navega de volta para a thread que está gerando resposta */
  onGoToStreamingThread?: () => void
  externalThreadId?: string | null
  className?: string
}

/** Converte o detalhe persistido da thread em itens de mensagem renderizáveis */
function rehydrateThreadMessages(threadDetail: ThreadDetail): ChatMessageItem[] {
  const rehydratedMessages: ChatMessageItem[] = threadDetail.messages.map((msg) => {
    const blocks: ChatMessageBlock[] = []

    if (msg.role === 'assistant') {
      if (msg.thought) {
        blocks.push({
          id: `th-${msg.id}`,
          type: 'thought',
          content: msg.thought
        })
      }
      if (msg.generated_sql) {
        blocks.push({
          id: `sql-${msg.id}`,
          type: 'sql',
          query: msg.generated_sql
        })
      }
    }

    blocks.push({
      id: `block-${msg.id}`,
      type: 'text',
      content: msg.content
    })

    if (msg.role === 'assistant' && msg.chart_spec) {
      blocks.push({
        id: `chart-${msg.id}`,
        type: 'chart',
        config: msg.chart_spec
      })
    }

    // Se for mensagem de assistente persistida sem steps gravados, fornece os steps padrão para o NodeStepper
    let steps = msg.steps || []
    const isInterruptedMessage = msg.id.startsWith('interrupted-') || (!msg.content && !msg.generated_sql && !msg.chart_spec)
    if (msg.role === 'assistant' && steps.length === 0) {
      if (isInterruptedMessage) {
        steps = [
          { step: 'interrupted', label: 'Processamento interrompido', status: 'error' }
        ]
      } else {
        steps = [
          { step: 'router', label: 'Classificando intenção', status: 'done' },
          ...(msg.generated_sql ? [
            { step: 'sql_generator', label: 'Escrevendo consulta SQL', status: 'done' as const },
            { step: 'sql_executor', label: 'Executando no cinerocket.db', status: 'done' as const }
          ] : []),
          ...(msg.chart_spec ? [
            { step: 'chart_generator', label: 'Avaliando visualização gráfica', status: 'done' as const }
          ] : []),
          { step: 'synthesizer', label: 'Formatando análise executiva', status: 'done' }
        ]
      }
    }

    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      blocks,
      steps,
      timestamp: threadDetail.updated_at ? threadDetail.updated_at * 1000 : Date.now()
    }
  })

  // Backend ainda processando (ex.: após reload): exibe placeholder em loading em vez de erro
  const last = rehydratedMessages.at(-1)
  if (threadDetail.is_running && last?.role === 'user') {
    rehydratedMessages.push({
      id: `running-${threadDetail.thread_id}`,
      role: 'assistant',
      content: '',
      blocks: [],
      steps: [],
      timestamp: Date.now(),
      isStreaming: true
    })
  }

  return rehydratedMessages
}

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
    messages: streamMessages,
    isStreaming,
    activeThreadId,
    activeTitle,
    sendMessage,
    retryMessage,
    loadThreadMessages
  } = stream

  const { config } = useProviderConfigQuery()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Consulta reativa e em cache com TanStack Query para os detalhes da thread selecionada
  const { data: threadDetail } = useThreadDetailQuery(externalThreadId)
  const currentDetail = threadDetail && threadDetail.thread_id === externalThreadId ? threadDetail : undefined

  const isViewingStreamThread = isStreaming && (externalThreadId ? activeThreadId === externalThreadId : true)
  // Há geração em andamento em OUTRA thread: a tela atual fica somente-leitura
  const isLockedByOtherThread = isStreaming && !isViewingStreamThread
  // O estado do stream corresponde à thread exibida
  const streamOwnsView = isViewingStreamThread || activeThreadId === (externalThreadId ?? null)
  // Backend ainda processa esta thread sem stream local (ex.: após recarregar a página)
  const isRunningRemotely = Boolean(currentDetail?.is_running) && !isViewingStreamThread
  const isModelLocked = isStreaming || isRunningRemotely

  const viewMessages = useMemo(
    () => (currentDetail ? rehydrateThreadMessages(currentDetail) : []),
    [currentDetail]
  )

  useEffect(() => {
    if (!currentDetail || isStreaming) return

    loadThreadMessages(
      currentDetail.thread_id,
      currentDetail.title,
      viewMessages
    )
  }, [currentDetail, viewMessages, isStreaming])

  const messages = streamOwnsView ? streamMessages : viewMessages

  const timelineItems = useMemo(() => {
    return messages
      .filter((message) => message.role === 'user')
      .map((message) => ({
        id: `turn-${message.id}`,
        title: message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '')
      }))
  }, [messages])

  // Chat novo recebendo o thread_id do backend: sincroniza URL
  useEffect(() => {
    if (!externalThreadId && activeThreadId) {
      onActiveThreadChange?.(activeThreadId)
    }
  }, [externalThreadId, activeThreadId, onActiveThreadChange])

  // Título gerado durante o stream só vale para a thread que o stream controla
  useEffect(() => {
    if (streamOwnsView && activeTitle) {
      onTitleChange?.(activeTitle)
    }
  }, [streamOwnsView, activeTitle, onTitleChange])

  useEffect(() => {
    onTimelineItemsChange?.(timelineItems)
  }, [timelineItems, onTimelineItemsChange])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text: string) => {
    if (isModelLocked) return
    sendMessage({
      message: text,
      provider: config?.provider,
      model: config?.model
    })
  }

  const handleRetry = (assistantMsgId: string) => {
    if (isModelLocked) return
    retryMessage(assistantMsgId, {
      provider: config?.provider,
      model: config?.model
    })
  }

  return (
    <div className={cn('flex flex-1 flex-col overflow-hidden relative', className)}>
      {/* Área Principal de Mensagens */}
      <div className="flex flex-1 overflow-hidden">
        <div data-chat-scroll-container className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-sidebar shadow-xl">
                  <Clapperboard className="size-7 text-primary" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-zinc-100">
                  CineData Analytics Intelligence
                </h2>
                <p className="mt-2 max-w-md text-sm text-zinc-400">
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
      </div>

      {/* Input de envio fixo no rodapé */}
      <div className="border-t border-white/5 bg-background/80 p-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-4xl space-y-2">
          {isLockedByOtherThread || isRunningRemotely ? (
            <button
              type="button"
              onClick={isLockedByOtherThread ? onGoToStreamingThread : undefined}
              className="flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-primary/10"
            >
              <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
              <span>
                {isLockedByOtherThread
                  ? 'Aguarde a resposta em curso para enviar uma nova mensagem.'
                  : 'Esta conversa ainda está sendo processada. A resposta aparecerá aqui ao concluir.'}
              </span>
            </button>
          ) : null}
          <ChatInput onSendMessage={handleSend} isStreaming={isModelLocked} />
        </div>
      </div>
    </div>
  )
}
