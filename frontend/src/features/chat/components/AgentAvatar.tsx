import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentAvatarProps {
  isStreaming?: boolean
  className?: string
}

export function AgentAvatar({ isStreaming = false, className }: AgentAvatarProps) {
  return (
    <div
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-linear-to-b from-[#1E2430] to-[#13171E] shadow-sm',
        isStreaming && 'border-[#FF5E2B]/40 shadow-[0_0_12px_rgba(255,94,43,0.25)]',
        className
      )}
    >
      <Bot className={cn('size-4.5 text-zinc-300', isStreaming && 'text-[#FF5E2B]')} />
      {isStreaming ? (
        <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF5E2B] opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[#FF5E2B]" />
        </span>
      ) : null}
    </div>
  )
}
