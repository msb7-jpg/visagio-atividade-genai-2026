import { Spinner } from '@/components/ui/spinner'
import { ChatErrorCard } from '@/features/chat/components/feed/ChatErrorCard'
import {
  CHAT_BLOCK_TYPE,
  type ChartJsConfigDTO,
  type ChatMessageBlock
} from '@/features/chat/types/chat.types'
import { lazy, Suspense, type JSX } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ThoughtInspector } from './ThoughtInspector'

const SqlCodeBlock = lazy(() =>
  import('./SqlCodeBlock').then((module) => ({ default: module.SqlCodeBlock }))
)

/**
 * Propriedades para despacho e renderização de blocos discriminados de conteúdo.
 */
export interface ContentRendererProps {
  /** Bloco discriminado a ser renderizado (thought, sql, text, error). */
  block: ChatMessageBlock
  /** Configuração do gráfico associado, se houver. */
  chartConfig?: ChartJsConfigDTO
  /** Callback para abertura do modal de configurações (usado em cards de erro). */
  onOpenSettings?: () => void
  /** Callback para retentativa de envio da mensagem. */
  onRetry?: () => void
}

/**
 * Roteador de renderização que seleciona o componente visual adequado com base no tipo discriminado do bloco.
 *
 * @param props - Propriedades contendo o bloco e callbacks de interação.
 * @returns Elemento JSX correspondente ao componente visual específico ou nulo.
 */
export function ContentRenderer({
  block,
  chartConfig,
  onOpenSettings,
  onRetry
}: ContentRendererProps): JSX.Element | null {
  switch (block.type) {
    case CHAT_BLOCK_TYPE.THOUGHT:
      return <ThoughtInspector key={block.id} thought={block.content} />
    case CHAT_BLOCK_TYPE.SQL:
      return (
        <Suspense
          key={block.id}
          fallback={(
            <div className="flex h-16 w-full items-center justify-center rounded-lg border border-border bg-card">
              <Spinner size="default" variant="muted" />
            </div>
          )}
        >
          <SqlCodeBlock query={block.query} />
        </Suspense>
      )
    case CHAT_BLOCK_TYPE.TEXT:
      return (
        <MarkdownRenderer
          key={block.id}
          content={block.content}
          chartConfig={chartConfig}
        />
      )
    case CHAT_BLOCK_TYPE.ERROR:
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
