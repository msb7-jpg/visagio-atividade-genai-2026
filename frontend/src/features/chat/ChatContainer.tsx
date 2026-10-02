import { useEffect, useRef } from 'react'
import { Clapperboard } from 'lucide-react'
import { ChatInput } from './components/ChatInput'
import { ChatMessage } from './components/ChatMessage'
import { useAgentStream } from './hooks/useAgentStream'
import { useProviderConfigQuery } from '@/features/settings/hooks/useProviderConfigQuery'
import { cn } from '@/lib/utils'

interface ChatContainerProps {
  onOpenSettings?: () => void
  onStreamingChange?: (isStreaming: boolean) => void
  className?: string
}

export function ChatContainer({ onOpenSettings, onStreamingChange, className }: ChatContainerProps) {
  const { messages, isStreaming, sendMessage } = useAgentStream()
  const { config } = useProviderConfigQuery()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onStreamingChange?.(isStreaming)
  }, [isStreaming, onStreamingChange])

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


  return (
    <div className={cn('flex flex-1 flex-col overflow-hidden', className)}>
      {/* Mensagens ou Empty State */}
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
                  'Qual ator participou do maior número de filmes?'
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
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input de envio fixo no rodapé */}
      <div className="border-t border-white/5 bg-[#0E1217]/80 p-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-4xl">
          <ChatInput
            onSendMessage={handleSend}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  )
}
