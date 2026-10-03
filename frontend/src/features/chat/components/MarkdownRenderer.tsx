import type { ChartJsConfigDTO } from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChartRenderer } from './ChartRenderer'
import { TableRenderer } from './TableRenderer'

interface MarkdownRendererProps {
  content: string
  chartConfig?: ChartJsConfigDTO
  className?: string
}

export function MarkdownRenderer({ content, chartConfig, className }: MarkdownRendererProps) {
  const hasInlineChartMarker = /```chart\b/i.test(content)

  return (
    <div
      className={cn(
        'prose prose-invert max-w-none text-base leading-relaxed text-zinc-200',
        'prose-headings:font-semibold prose-headings:text-zinc-100 prose-headings:tracking-tight',
        'prose-h1:text-2xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-2.5 prose-h1:mt-7 prose-h1:mb-3.5',
        'prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3',
        'prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2.5 text-zinc-100',
        'prose-h4:text-base prose-h4:mt-4 prose-h4:mb-2 text-zinc-200',
        'prose-p:my-3 prose-p:leading-relaxed',
        'prose-ul:my-3 prose-li:my-1',
        'prose-strong:text-white prose-strong:font-semibold',
        'prose-table:w-full prose-table:border-collapse prose-table:text-left prose-table:my-0',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => <TableRenderer>{children}</TableRenderer>,
          pre: ({ children }) => {
            const childArray = Array.isArray(children) ? children : [children]
            const firstChild = childArray[0]
            if (
              firstChild &&
              typeof firstChild === 'object' &&
              'props' in firstChild &&
              firstChild.props?.className?.includes('language-chart')
            ) {
              return <>{children}</>
            }
            return <pre>{children}</pre>
          },
          code: ({ className: codeClassName, children, ...props }) => {
            const isChartBlock = codeClassName?.includes('language-chart')
            if (isChartBlock) {
              if (chartConfig) {
                return (
                  <div className="not-prose my-4">
                    <ChartRenderer config={chartConfig} />
                  </div>
                )
              }
              // Suprime blocos ```chart vazios/alucinados quando não há gráfico gerado
              return null
            }
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Fallback gracioso: se o gráfico existe mas o modelo não emitiu o marcador ```chart``` */}
      {chartConfig && !hasInlineChartMarker && (
        <div className="not-prose mt-4">
          <ChartRenderer config={chartConfig} />
        </div>
      )}
    </div>
  )
}
