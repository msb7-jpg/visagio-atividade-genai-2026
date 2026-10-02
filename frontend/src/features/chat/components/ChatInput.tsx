import { useState, type KeyboardEvent } from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isStreaming: boolean
  className?: string
}

export function ChatInput({ onSendMessage, isStreaming, className }: ChatInputProps) {
  const [text, setText] = useState('')

  const handleSend = () => {
    if (!text.trim() || isStreaming) return
    onSendMessage(text)
    setText('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/10 bg-[#13171E]/80 p-2 shadow-xl backdrop-blur-xl transition-all focus-within:border-[#FF5E2B]/50 focus-within:ring-1 focus-within:ring-[#FF5E2B]/50',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="pl-2 text-zinc-400">
          <Sparkles className="size-4 text-[#FF5E2B]" />
        </div>

        <Input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Faça uma pergunta sobre bilheterias, diretores ou filmes..."
          disabled={isStreaming}
          className="h-10 border-0 bg-transparent px-2 text-sm text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || isStreaming}
          className="size-9 shrink-0 rounded-xl bg-[#FF5E2B] text-white hover:bg-[#FF5E2B]/90 disabled:opacity-30"
        >
          <ArrowUp className="size-4.5" />
        </Button>
      </div>
    </div>
  )
}
