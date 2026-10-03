import { Button } from '@/components/ui/button'
import { Check, Copy, RotateCcw, Settings2 } from 'lucide-react'
import { useState } from 'react'

export interface ChatMessageActionsProps {
  messageContent: string
  onRetry?: () => void
  onOpenSettings?: () => void
  isStreaming?: boolean
}

export function ChatMessageActions({
  messageContent,
  onRetry,
  onOpenSettings,
  isStreaming = false
}: ChatMessageActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="flex items-center gap-1.5 pt-1 text-zinc-400">
      {onRetry ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isStreaming}
          onClick={onRetry}
          title="Tentar novamente / Regenerar resposta"
          className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
        >
          <RotateCcw className="size-3.5 mr-1" />
          <span>Regenerar</span>
        </Button>
      ) : null}

      {onOpenSettings ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isStreaming}
          onClick={onOpenSettings}
          title="Trocar modelo / Alterar configurações de IA"
          className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
        >
          <Settings2 className="size-3.5 mr-1" />
          <span>Trocar Modelo</span>
        </Button>
      ) : null}

      {messageContent ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          title="Copiar resposta"
          className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
        >
          {copied ? (
            <>
              <Check className="size-3.5 mr-1 text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 mr-1" />
              <span>Copiar</span>
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}
