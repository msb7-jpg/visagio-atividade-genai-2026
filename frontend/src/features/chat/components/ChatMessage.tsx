import { Button } from '@/components/ui/button'
import type {
  ChartJsConfigDTO,
  ChatBlockError,
  ChatMessageBlock,
  ChatMessageItem
} from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  User
} from 'lucide-react'
import { useState } from 'react'
import { AgentAvatar } from './AgentAvatar'
import { MarkdownRenderer } from './MarkdownRenderer'
import { NodeStepper } from './NodeStepper'
import { SqlCodeBlock } from './SqlCodeBlock'
import { ThoughtInspector } from './ThoughtInspector'

interface ChatErrorCardProps {
  block: ChatBlockError
  onOpenSettings?: () => void
}

function ChatErrorCard({ block, onOpenSettings }: ChatErrorCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const isSettingsRelated =
    block.code === 'RESOURCE_EXHAUSTED' ||
    block.code === 'UNAUTHORIZED' ||
    block.code === 'CONNECTION_REFUSED' ||
    block.code === 'TIMEOUT'

  return (
    <div
      data-testid="chat-error-card"
      className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive mt-0.5">
          <AlertCircle className="size-4" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-xs font-semibold text-foreground tracking-wide">
            {block.code ? `Falha na Execução (${block.code})` : 'Falha na Execução'}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {block.message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-destructive/15">
        {isSettingsRelated && onOpenSettings ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="border-destructive/30 hover:bg-destructive/20 text-foreground"
          >
            <Settings className="size-3.5 mr-1.5" />
            <span>Configurar Provedor</span>
          </Button>
        ) : null}

        {block.rawError && block.rawError !== block.message ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            {showDetails ? (
              <>
                <ChevronUp className="size-3.5 mr-1" />
                <span>Ocultar detalhes</span>
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5 mr-1" />
                <span>Ver detalhes técnicos</span>
              </>
            )}
          </Button>
        ) : null}
      </div>

      {showDetails && block.rawError ? (
        <pre className="max-h-40 overflow-x-auto rounded-lg border border-border bg-card p-2.5 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all">
          {block.rawError}
        </pre>
      ) : null}
    </div>
  )
}

interface ChatMessageProps {
  message: ChatMessageItem
  onOpenSettings?: () => void
  className?: string
}

function renderBlock(
  block: ChatMessageBlock,
  chartConfig?: ChartJsConfigDTO,
  onOpenSettings?: () => void
) {
  switch (block.type) {
    case 'thought':
      return <ThoughtInspector key={block.id} thought={block.content} />
    case 'sql':
      return <SqlCodeBlock key={block.id} query={block.query} />
    case 'chart':
      // O gráfico não é renderizado isoladamente para evitar exibição prematura ou duplicada.
      // Sua visualização ocorre estritamente dentro do MarkdownRenderer no sumário executivo.
      return null
    case 'data':
      // A representação tabular é gerada e integrada unicamente dentro do MarkdownRenderer.
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
      return <ChatErrorCard key={block.id} block={block} onOpenSettings={onOpenSettings} />
    default:
      return null
  }
}

export function ChatMessage({ message, onOpenSettings, className }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const chartBlock = message.blocks.find(
    (block): block is import('@/features/chat/types/chat.types').ChatBlockChart => block.type === 'chart'
  )
  const hasTextBlock = message.blocks.some((b) => b.type === 'text')
  const chartConfig = chartBlock?.config

  if (isUser) {
    return (
      <div className={cn('flex flex-col items-end gap-1.5', className)}>
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

  return (
    <div className={cn('flex items-start gap-3.5', className)}>
      <AgentAvatar isStreaming={message.isStreaming} />

      <div className="flex-1 space-y-3 overflow-hidden">
        {/* Passos dos nós do LangGraph */}
        {(message.steps.length > 0 || message.isStreaming) ? (
          <NodeStepper steps={message.steps} isStreaming={message.isStreaming} />
        ) : null}

        {/* Blocos da mensagem (thought, sql, markdown, data, error) */}
        {message.blocks.map((block) =>
          renderBlock(
            block,
            !message.isStreaming && hasTextBlock ? chartConfig : undefined,
            onOpenSettings
          )
        )}

        {/* Fallback de conteúdo direto se não houver blocos */}
        {message.blocks.length === 0 && message.content ? (
          <MarkdownRenderer
            content={message.content}
            chartConfig={!message.isStreaming ? chartConfig : undefined}
          />
        ) : null}

        {/* Metadados do modelo de inferência usado */}
        {!message.isStreaming && message.model ? (
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-zinc-500 font-mono select-none">
            <span>Modelo:</span>
            <span className="text-zinc-400">{message.model}</span>
            {message.provider ? (
              <span className="text-zinc-600 capitalize">({message.provider})</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )

}
