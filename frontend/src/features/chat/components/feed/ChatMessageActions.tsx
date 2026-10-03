import { Button } from '@/components/ui/button'
import { Check, Copy, RotateCcw, Settings2 } from 'lucide-react'
import { useState, type JSX } from 'react'

/**
 * Propriedades para a barra de ações rápidas de uma mensagem do assistente.
 */
export interface ChatMessageActionsProps {
  /** Conteúdo textual da mensagem a ser copiado. */
  messageContent?: string
  /** Alias para messageContent. */
  content?: string
  /** Callback para regerar a resposta com a mesma consulta. */
  onRetry?: () => void
  /** Callback para abrir o modal de configurações de IA. */
  onOpenSettings?: () => void
  /**
   * Indica se o streaming da mensagem ainda está em execução.
   * @defaultValue `false`
   */
  isStreaming?: boolean
}

/**
 * Barra de botões secundários para copiar texto, regenerar resposta ou alternar configurações de modelo.
 *
 * @param props - Propriedades de conteúdo textual e ações disponíveis.
 * @returns Elemento JSX com a barra de botões de ação rápida.
 */
export function ChatMessageActions({
  messageContent,
  content,
  onRetry,
  onOpenSettings,
  isStreaming = false
}: ChatMessageActionsProps): JSX.Element {
  const [copied, setCopied] = useState(false)
  const effectiveText = messageContent || content || ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(effectiveText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="flex items-center gap-1.5 pt-1 text-muted-foreground">
      {onRetry ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isStreaming}
          onClick={onRetry}
          title="Tentar novamente / Regenerar resposta"
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
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
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5 mr-1" />
          <span>Trocar Modelo</span>
        </Button>
      ) : null}

      {effectiveText ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          title="Copiar resposta"
          className="text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1 text-accent-emerald" />
              <span className="text-accent-emerald">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              <span>Copiar</span>
            </>
          )}
        </Button>
      ) : null}
    </div>
  )
}
