import type {
  ChartJsConfigDTO,
  ChatMessageBlock,
  ChatMessageItem
} from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'
import { MarkdownRenderer } from '@/features/chat/components/renderers/MarkdownRenderer'
import { SqlCodeBlock } from '@/features/chat/components/renderers/SqlCodeBlock'
import { ThoughtInspector } from '@/features/chat/components/renderers/ThoughtInspector'
import { AgentAvatar } from './AgentAvatar'
import { ChatErrorCard } from './ChatErrorCard'
import { ChatMessageActions } from './ChatMessageActions'
import { NodeStepper } from './NodeStepper'

export interface ChatMessageProps {
  message: ChatMessageItem
  onOpenSettings?: () => void
  onRetry?: () => void
  /** Bloqueia ações que acionam o modelo (regenerar/trocar modelo) enquanto há geração em andamento */
  actionsDisabled?: boolean
  className?: string
}

function renderBlock(
  block: ChatMessageBlock,
  chartConfig?: ChartJsConfigDTO,
  onOpenSettings?: () => void,
  onRetry?: () => void
) {
  switch (block.type) {
    case 'thought':
      return <ThoughtInspector key={block.id} thought={block.content} />
    case 'sql':
      return <SqlCodeBlock key={block.id} query={block.query} />
    case 'chart':
      return null
    case 'data':
      return null
    case 'text':
      return (
        <MarkdownRenderer
          key={block.id}
          content={block.content}
          chartConfig={chartConfig}
        />
      )
    case 'error':
      return (
        <ChatErrorCard
          key={block.id}
          block={block}
          onOpenSettings={onOpenSettings}
          onRetry={onRetry}
        />
      )
    default:
      return null
  }
}

export function ChatMessage({ message, onOpenSettings, onRetry, actionsDisabled = false, className }: ChatMessageProps) {
  const isUser = message.role === 'user'
  // Enquanto qualquer conversa estiver em geração, ações que acionam o modelo ficam bloqueadas
  const effectiveRetry = actionsDisabled ? undefined : onRetry

  const chartBlock = message.blocks.find(
    (block): block is import('@/features/chat/types/chat.types').ChatBlockChart => block.type === 'chart'
  )
  const chartConfig = chartBlock?.config

  if (isUser) {
    return (
      <div id={`turn-${message.id}`} className={cn('flex flex-col items-end gap-1.5', className)}>
        <div className="flex justify-end gap-3 w-full">
          <div className="max-w-[85%] rounded-2xl bg-[#FF5E2B]/10 border border-[#FF5E2B]/20 px-4 py-3 text-sm text-zinc-100 shadow-sm sm:max-w-[70%]">
            {message.content}
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#1E2430] text-zinc-400">
            <User className="size-4.5" />
          </div>
        </div>
      </div>
    )
  }

  const textBlock = message.blocks.find((block) => block.type === 'text')
  const textualContent = textBlock?.content || message.content || ''

  return (
    <div id={`turn-${message.id}`} className={cn('flex items-start gap-3.5', className)}>
      <AgentAvatar isStreaming={message.isStreaming} />

      <div className="flex-1 space-y-3 overflow-hidden">
        {/* Passos dos nós do LangGraph */}
        {message.steps.length > 0 || message.isStreaming ? (
          <NodeStepper steps={message.steps} isStreaming={message.isStreaming} />
        ) : null}

        {/* Blocos da mensagem (thought, sql, markdown, data, error) */}
        {message.blocks.map((block) =>
          renderBlock(
            block,
            chartConfig,
            onOpenSettings,
            effectiveRetry
          )
        )}

        {/* Fallback de conteúdo direto se não houver blocos */}
        {message.blocks.length === 0 && message.content ? (
          <MarkdownRenderer
            content={message.content}
            chartConfig={chartConfig}
          />
        ) : null}

        {/* Barra de Ações: Regenerar, Trocar Modelo, Copiar (quando houver resposta ou falha/interrupção) */}
        {!message.isStreaming && (textualContent || message.blocks.some((b) => b.type === 'error') || message.steps.some((s) => s.status === 'error')) ? (
          <ChatMessageActions
            messageContent={textualContent}
            onRetry={onRetry}
            onOpenSettings={onOpenSettings}
            isStreaming={message.isStreaming || actionsDisabled}
          />
        ) : null}

        {/* Metadados do modelo de inferência usado */}
        {!message.isStreaming && (message.model || message.provider) ? (
          <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-zinc-500 font-mono select-none">
            <span>Modelo:</span>
            <span className="text-zinc-400">{message.model || 'Padrão'}</span>
            {message.provider ? (
              <span className="text-zinc-600 capitalize">({message.provider})</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
