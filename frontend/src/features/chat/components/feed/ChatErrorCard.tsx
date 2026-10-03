import { Button } from '@/components/ui/button'
import type { ChatBlockError } from '@/features/chat/types/chat.types'
import { AlertCircle, ChevronDown, ChevronUp, RotateCcw, Settings } from 'lucide-react'
import { useState, type JSX } from 'react'

/**
 * Propriedades para renderização do card de erro de processamento analítico.
 */
export interface ChatErrorCardProps {
  /** Bloco discriminado de erro contendo mensagem, código e erro técnico bruto. */
  block: ChatBlockError
  /** Callback para abertura do modal de configurações de IA. */
  onOpenSettings?: () => void
  /** Callback para nova tentativa de envio. */
  onRetry?: () => void
}

/**
 * Card destacado para apresentação de falhas de provedor, validação SQL ou erros de rede.
 *
 * @param props - Propriedades contendo os dados do erro e opções de recuperação.
 * @returns Elemento JSX com mensagem de erro, detalhes técnicos expansíveis e botões de ação.
 */
export function ChatErrorCard({ block, onOpenSettings, onRetry }: ChatErrorCardProps): JSX.Element {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div
      data-testid="chat-error-card"
      className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive mt-0.5">
          <AlertCircle className="h-4 w-4" />
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

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-destructive/15">
        {onRetry ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onRetry}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            <span>Tentar Novamente</span>
          </Button>
        ) : null}

        {onOpenSettings ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="border-destructive/30 hover:bg-destructive/20"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            <span>Configurar Provedor</span>
          </Button>
        ) : null}

        {block.rawError && block.rawError !== block.message ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                <span>Ocultar detalhes</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
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
