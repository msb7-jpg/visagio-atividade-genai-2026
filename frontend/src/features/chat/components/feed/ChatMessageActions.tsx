import { Button } from '@/components/ui/button'
import { copyMessageWithChart } from '@/features/chat/lib/clipboardRichUtils'
import { useTimeoutFn } from '@reactuses/core'
import { BarChart3, Check, Copy, RotateCcw, Settings2 } from 'lucide-react'
import { useState, type JSX } from 'react'

/**
 * Propriedades para a barra de ações rápidas de uma mensagem do assistente.
 */
export interface ChatMessageActionsProps {
  /** Conteúdo textual da mensagem a ser copiado. */
  messageContent?: string
  /** Alias para messageContent. */
  content?: string
  /** Identificador do container da mensagem no DOM para localização de gráficos renderizados. */
  turnId?: string
  /** Callback para regerar a resposta com a mesma consulta. */
  onRetry?: () => void
  /** Callback para abrir o modal de configurações de IA. */
  onOpenSettings?: () => void
  /** Callback para acionar a geração de gráfico a partir dos dados da mensagem. */
  onGenerateChart?: () => void
  /** Indica se a mensagem já contém um gráfico renderizado. */
  hasChart?: boolean
  /**
   * Indica se o streaming da mensagem ainda está em execução.
   * @defaultValue `false`
   */
  isStreaming?: boolean
}

/**
 * Barra de botões secundários para copiar texto, regenerar resposta, gerar gráfico ou alternar configurações de modelo.
 *
 * @param props - Propriedades de conteúdo textual e ações disponíveis.
 * @returns Elemento JSX com a barra de botões de ação rápida.
 */
export function ChatMessageActions({
  messageContent,
  content,
  turnId,
  onRetry,
  onOpenSettings,
  onGenerateChart,
  hasChart = false,
  isStreaming = false
}: ChatMessageActionsProps): JSX.Element {
  const [copied, setCopied] = useState(false)
  const [, , resetCopiedTimeout] = useTimeoutFn(
    () => {
      setCopied(false)
    },
    2000,
    { immediate: false }
  )
  const effectiveText = messageContent || content || ''

  const handleCopy = async () => {
    const container = turnId ? document.getElementById(turnId) : null
    const canvas = container?.querySelector('canvas') || null
    const chartTitle =
      canvas?.closest('[data-chart-container]')?.getAttribute('data-chart-title') || undefined

    const success = await copyMessageWithChart(effectiveText, canvas, chartTitle)
    if (success) {
      setCopied(true)
      resetCopiedTimeout()
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

      {onGenerateChart && !hasChart ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isStreaming}
          onClick={onGenerateChart}
          title="Gerar visualização gráfica para esta análise"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1" />
          <span>Gerar Gráfico</span>
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
