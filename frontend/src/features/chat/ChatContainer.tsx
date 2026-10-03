import { useThreadDetailQuery } from '@/features/chat/hooks/useThreadDetailQuery'
import type { ChatMessageItem } from '@/features/chat/types/chat.types'
import { useProviderConfigQuery } from '@/features/settings/hooks/useProviderConfigQuery'
import { cn } from '@/lib/utils'
import { Clapperboard } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { ChatMessage } from './components/feed/ChatMessage'
import { ChatInput } from './components/input/ChatInput'
import { useAgentStream } from './hooks/useAgentStream'

export interface ChatContainerProps {
  onOpenSettings?: () => void
  onStreamingChange?: (isStreaming: boolean) => void
  onTitleChange?: (title: string | null) => void
  onActiveThreadChange?: (threadId: string | null) => void
  onTimelineItemsChange?: (items: { id: string; title: string }[]) => void
  externalThreadId?: string | null
  className?: string
}

export function ChatContainer({
  onOpenSettings,
  onStreamingChange,
  onTitleChange,
  onActiveThreadChange,
  onTimelineItemsChange,
  externalThreadId,
  className
}: ChatContainerProps) {
  const {
    messages,
    isStreaming,
    activeThreadId,
    activeTitle,
    sendMessage,
    retryMessage,
    loadThreadMessages
  } = useAgentStream(externalThreadId)

  const { config } = useProviderConfigQuery()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Consulta reativa e em cache com TanStack Query para os detalhes da thread selecionada
  const { data: threadDetail } = useThreadDetailQuery(externalThreadId)

  // Reidrata mensagens quando os dados da thread chegam via TanStack Query
  useEffect(() => {
    if (!threadDetail || isStreaming) return
    if (threadDetail.thread_id !== externalThreadId) return

    const rehydratedMessages: ChatMessageItem[] = threadDetail.messages.map((msg) => {
      const blocks: import('@/features/chat/types/chat.types').ChatMessageBlock[] = [
        {
          id: `block-${msg.id}`,
          type: 'text',
          content: msg.content
        }
      ]

      if (msg.role === 'assistant' && msg.chart_spec) {
        blocks.push({
          id: `chart-${msg.id}`,
          type: 'chart',
          config: msg.chart_spec
        })
      }

      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        blocks,
        steps: msg.steps || [],
        timestamp: threadDetail.updated_at ? threadDetail.updated_at * 1000 : Date.now()
      }
    })

    loadThreadMessages(threadDetail.thread_id, threadDetail.title, rehydratedMessages)
  }, [threadDetail, externalThreadId, isStreaming])

  // Itens para o TimelineScrollSpy (mini-mapa lateral direito)
  const timelineItems = useMemo(() => {
    return messages
      .filter((message) => message.role === 'user')
      .map((message) => ({
        id: `turn-${message.id}`,
        title: message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '')
      }))
  }, [messages])

  // Consolidação de notificações de estado para o layout / componente pai
  useEffect(() => {
    onStreamingChange?.(isStreaming)
    onTitleChange?.(activeTitle)
    onActiveThreadChange?.(activeThreadId)
    onTimelineItemsChange?.(timelineItems)
  }, [
    isStreaming,
    activeTitle,
    activeThreadId,
    timelineItems,
    onStreamingChange,
    onTitleChange,
    onActiveThreadChange,
    onTimelineItemsChange
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text: string) => {
    sendMessage({
      message: text,
      provider: config?.provider,
      model: config?.model
    })
  }

  const handleRetry = (assistantMsgId: string) => {
    retryMessage(assistantMsgId, {
      provider: config?.provider,
      model: config?.model
    })
  }

  return (
    <div className={cn('flex flex-1 flex-col overflow-hidden relative', className)}>
      {/* Área Principal de Mensagens */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-[#13171E] shadow-xl">
                  <Clapperboard className="size-7 text-[#FF5E2B]" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-zinc-100">
                  CineData Analytics Intelligence
                </h2>
                <p className="mt-2 max-w-md text-sm text-zinc-400">
                  Consulte bilheterias, diretores, atores, lucros médios e estatísticas do
                  catálogo de cinema em linguagem natural com validação SQL em tempo real.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {[
                    'Quais os 10 filmes com maior faturamento de bilheteria?',
                    'Qual o lucro médio por gênero de filme?',
                    'Quais os 5 diretores com melhor média no IMDb?',
                    'Qual ator participou do maior número de filmes?',
                    'Gere um gráfico de barras com as 5 produtoras mais lucrativas do catálogo.',
                    'Mostre um gráfico comparativo de faturamento dos top 5 filmes de ficção científica.',
                    'Trace a evolução da nota média dos filmes no IMDb ao longo dos anos.',
                    'Exiba um gráfico de pizza com a distribuição percentual de filmes pelos 5 principais gêneros.'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSend(suggestion)}
                      className="rounded-xl border border-white/10 bg-[#13171E]/60 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-[#FF5E2B]/40 hover:bg-[#FF5E2B]/10 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOpenSettings={onOpenSettings}
                  onRetry={() => handleRetry(msg.id)}
                />
              ))
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input de envio fixo no rodapé */}
      <div className="border-t border-white/5 bg-[#0E1217]/80 p-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-4xl">
          <ChatInput onSendMessage={handleSend} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  )
}
