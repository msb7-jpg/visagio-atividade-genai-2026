import { CollapsibleMotion } from '@/components/animations'
import { Button } from '@/components/ui/button'
import { cn, handleKeyboardClick } from '@/lib/utils'
import { useCopyToClipboard } from '@reactuses/core'
import { Check, ChevronRight, Copy, Database } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * Propriedades para renderização do bloco de código SQL.
 */
export interface SqlCodeBlockProps {
  /** Texto da consulta SQL formatada. */
  query: string
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Bloco colapsável com syntax highlighting (Shiki) e botão de cópia para consultas SQL.
 *
 * @param props - Propriedades com a query SQL e estilização.
 * @returns Elemento JSX do card de código SQL interativo.
 */
export function SqlCodeBlock({ query, className }: SqlCodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function highlight() {
      try {
        const { codeToHtml } = await import('shiki')
        const html = await codeToHtml(query, {
          lang: 'sql',
          theme: 'vitesse-dark'
        })
        if (isMounted) {
          setHighlightedHtml(html)
        }
      } catch {
        if (isMounted) {
          setHighlightedHtml(`<pre><code>${query}</code></pre>`)
        }
      }
    }
    highlight()
    return () => {
      isMounted = false
    }
  }, [query])

  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation()
    copyToClipboard(query)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-sidebar shadow-lg transition-all',
        className
      )}
    >
      {/* Top bar / Collapse trigger */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Alternar exibição da consulta SQL"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(event) => handleKeyboardClick(event, () => setIsExpanded((prev) => !prev))}
        className="flex cursor-pointer select-none items-center justify-between border-b border-border bg-sidebar px-3 py-1 transition-colors hover:bg-card-hover"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
          <Database className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Consulta SQL</span>

          <span className="text-xs text-subtle-foreground">
            {isExpanded ? '(clique para recolher)' : '(clique para expandir)'}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {isCopied ? (
            <>
              <Check className="h-3.5 w-3.5 text-accent-emerald" />
              <span className="text-accent-emerald">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Area (colapsável) */}
      <CollapsibleMotion isExpanded={isExpanded}>
        <div className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground border-t border-border bg-card">
          {highlightedHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              className="[&_pre]:bg-transparent! [&_pre]:p-0!"
            />
          ) : (
            <pre className="text-muted-foreground">{query}</pre>
          )}
        </div>
      </CollapsibleMotion>

    </div>
  )
}
