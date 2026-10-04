import { ContentRenderer } from '@/features/chat/components/renderers/ContentRenderer'
import { MarkdownRenderer } from '@/features/chat/components/renderers/MarkdownRenderer'
import {
  CHAT_BLOCK_TYPE,
  MESSAGE_ROLE,
  STEP_STATUS,
  type ChatBlockChart,
  type ChatMessageItem
} from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'
import type { JSX } from 'react'
import { AgentAvatar } from './AgentAvatar'
import { ChatMessageActions } from './ChatMessageActions'
import { NodeStepper } from './NodeStepper'

/**
 * Propriedades para renderização de uma mensagem de conversa individual no feed.
 */
export interface ChatMessageProps {
  /** Objeto consolidado da mensagem com blocos, etapas e metadados. */
  message: ChatMessageItem
  /** Callback para abertura do painel de configurações. */
  onOpenSettings?: () => void
  /** Callback para nova tentativa de envio. */
  onRetry?: () => void
  /**
   * Bloqueia ações que acionam o modelo (regenerar/trocar modelo) enquanto há geração em andamento.
   * @defaultValue `false`
   */
  actionsDisabled?: boolean
  /** Classes CSS adicionais para o container. */
  className?: string
}

/**
 * Renderiza a lista de blocos discriminados ou o fallback em Markdown.
 *
 * @param message - Mensagem de chat atual.
 * @param chartConfig - Configuração do gráfico se presente.
 * @param onOpenSettings - Callback para abrir configurações.
 * @param effectiveRetry - Callback para retentar resposta.
 * @param textualContent - Texto consolidado.
 * @returns Elementos JSX de conteúdo ou nulo.
 */
function renderMessageBlocks(
  message: ChatMessageItem,
  chartConfig?: import('@/features/chat/types/chat.types').ChartJsConfigDTO,
  onOpenSettings?: () => void,
  effectiveRetry?: () => void,
  textualContent = ''
): JSX.Element | JSX.Element[] | null {
  if (message.blocks && message.blocks.length > 0) {
    return message.blocks.map((block) => (
      <ContentRenderer
        key={block.id}
        block={block}
        chartConfig={chartConfig}
        onOpenSettings={onOpenSettings}
        onRetry={effectiveRetry}
      />
    ))
  }

  if (textualContent) {
    return (
      <MarkdownRenderer
        content={textualContent}
        chartConfig={chartConfig}
      />
    )
  }

  return null
}

/**
 * Componente que renderiza um balão de conversa do usuário ou a resposta composta do assistente analítico.
 *
 * @param props - Propriedades de configuração da mensagem e callbacks de ação.
 * @returns Elemento JSX formatado para usuário ou assistente.
 */
export function ChatMessage({
  message,
  onOpenSettings,
  onRetry,
  actionsDisabled = false,
  className
}: ChatMessageProps): JSX.Element {
  const isUser = message.role === MESSAGE_ROLE.USER
  const effectiveRetry = actionsDisabled ? undefined : onRetry

  const chartBlock = message.blocks.find(
    (block): block is ChatBlockChart => block.type === CHAT_BLOCK_TYPE.CHART
  )
  const chartConfig = chartBlock?.config

  if (isUser) {
    return (
      <div
        id={`turn-${message.id}`}
        data-timeline-turn={`turn-${message.id}`}
        className={cn('flex flex-col items-end gap-1.5', className)}
      >
        <div className="flex justify-end gap-3 w-full">
          <div className="max-w-xl sm:max-w-2xl rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-foreground shadow-sm">
            {message.content}
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    )
  }

  const textBlock = message.blocks.find((block) => block.type === CHAT_BLOCK_TYPE.TEXT)
  const textualContent = textBlock?.content || message.content || ''

  const hasError =
    message.blocks.some((block) => block.type === CHAT_BLOCK_TYPE.ERROR) ||
    message.steps.some((step) => step.status === STEP_STATUS.ERROR)
  const showActions = !message.isStreaming && (Boolean(textualContent) || hasError)

  return (
    <div id={`msg-${message.id}`} className={cn('flex items-start gap-3.5', className)}>
      <AgentAvatar isStreaming={message.isStreaming} />

      <div className="flex flex-1 flex-col gap-3 min-w-0">
        {/* Linha do tempo das etapas do agente */}
        {(message.steps && message.steps.length > 0) || message.isStreaming ? (
          <NodeStepper
            steps={message.steps || []}
            isStreaming={message.isStreaming}
          />
        ) : null}

        {/* Blocos de conteúdo modulares ou Markdown fallback */}
        {renderMessageBlocks(message, chartConfig, onOpenSettings, effectiveRetry, textualContent)}

        {/* Rodapé da mensagem: Ações e Metadados de Provedor e Modelo */}
        {showActions || message.provider || message.model ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {showActions ? (
              <ChatMessageActions
                turnId={`msg-${message.id}`}
                content={textualContent}
                onRetry={effectiveRetry}
                onOpenSettings={onOpenSettings}
                isStreaming={actionsDisabled}
              />
            ) : (
              <div />
            )}

            {message.provider || message.model ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <span className="font-semibold uppercase tracking-wider">
                  {message.provider || 'AI'}
                </span>
                {message.model ? <span>• {message.model}</span> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
