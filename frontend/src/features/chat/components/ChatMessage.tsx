import type { ChatMessageBlock, ChatMessageItem } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'
import { AgentAvatar } from './AgentAvatar'
import { MarkdownRenderer } from './MarkdownRenderer'
import { NodeStepper } from './NodeStepper'
import { SqlCodeBlock } from './SqlCodeBlock'
import { ThoughtInspector } from './ThoughtInspector'

interface ChatMessageProps {
  message: ChatMessageItem
  className?: string
}

function renderBlock(block: ChatMessageBlock) {
  switch (block.type) {
    case 'thought':
      return <ThoughtInspector key={block.id} thought={block.content} />
    case 'sql':
      return <SqlCodeBlock key={block.id} query={block.query} />
    case 'text':
      return <MarkdownRenderer key={block.id} content={block.content} />
    case 'data':
      return null // Tabelas serão enriquecidas no Slice 3
    default:
      return null
  }
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === 'user'

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
        {message.model && (
          <div className="mr-12 text-[11px] font-medium text-zinc-500 tracking-wide select-none">
            {message.model}
          </div>
        )}
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

        {/* Blocos da mensagem (thought, sql, markdown, data) */}
        {message.blocks.map(renderBlock)}

        {/* Fallback de conteúdo direto se não houver blocos */}
        {message.blocks.length === 0 && message.content ? <MarkdownRenderer content={message.content} /> : null}
      </div>
    </div>
  )
}
