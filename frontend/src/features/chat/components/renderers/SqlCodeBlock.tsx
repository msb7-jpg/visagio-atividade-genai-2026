import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@reactuses/core'
import { Check, ChevronRight, Copy, Database } from 'lucide-react'
import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

interface SqlCodeBlockProps {
  query: string
  className?: string
}

export function SqlCodeBlock({ query, className }: SqlCodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [highlightedHtml, setHighlightedHtml] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()

  useEffect(() => {
    let isMounted = true
    async function highlight() {
      try {
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
        'group relative overflow-hidden rounded-xl border border-white/10 bg-sidebar/60 shadow-lg transition-all',
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
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsExpanded((prev) => !prev)
          }
        }}
        className="flex cursor-pointer select-none items-center justify-between border-b border-white/5 bg-[#171C25] px-3.5 py-2.5 transition-colors hover:bg-[#1D232F]"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'size-4 text-zinc-400 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
          <Database className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-zinc-300">Consulta SQL</span>
          
          <span className="text-[11px] text-zinc-500">
            {isExpanded ? '(clique para recolher)' : '(clique para expandir)'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 px-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        >
          {isCopied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copiar</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Area (colapsável) */}
      {isExpanded ? (
        <div className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-200 border-t border-white/5 bg-[#11151C]">
          {highlightedHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              className="[&_pre]:bg-transparent! [&_pre]:p-0!"
            />
          ) : (
            <pre className="text-zinc-400">{query}</pre>
          )}
        </div>
      ) : null}
    </div>
  )
}
