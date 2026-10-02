import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useClickAway, useCopyToClipboard } from '@reactuses/core'
import { Check, Copy, MoreHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

function TableBlock({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()

  useClickAway(menuRef, () => {
    setIsMenuOpen(false)
  })

  const handleCopy = () => {
    if (!containerRef.current) return
    const tableEl = containerRef.current.querySelector('table')
    if (!tableEl) return

    const rows = Array.from(tableEl.querySelectorAll('tr'))
    const tsvData = rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'))
        return cells.map((cell) => cell.textContent?.trim() ?? '').join('\t')
      })
      .join('\n')

    copyToClipboard(tsvData)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
      setIsMenuOpen(false)
    }, 1500)
  }

  return (
    <div
      ref={containerRef}
      className="group relative my-5 overflow-hidden rounded-xl border border-white/10 bg-[#13171E]/60 shadow-lg"
    >
      {/* Botão de ação discreto (...) no topo superior direito da tabela */}
      <div ref={menuRef} className="absolute right-2 top-2 z-20">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Opções da tabela"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="h-7 w-7 p-0 text-zinc-400 opacity-70 transition-opacity hover:bg-[#1B202B] hover:text-zinc-200 group-hover:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </Button>

        {isMenuOpen ? (
          <div className="absolute right-0 mt-1 min-w-[140px] rounded-lg border border-white/10 bg-[#1B202B] p-1 shadow-2xl backdrop-blur-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="flex w-full items-center justify-start gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/5 hover:text-white"
            >
              {isCopied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-zinc-400" />
                  <span>Copiar tabela</span>
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
    </div>
  )
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
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
          table: ({ children }) => <TableBlock>{children}</TableBlock>,
          thead: ({ children, ...props }) => (
            <thead className="bg-[#1B202B]/90 text-zinc-300 font-semibold border-b border-white/10" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-3 text-sm font-semibold capitalize tracking-normal text-zinc-200 border-b border-white/10" {...props}>
              {children}
            </th>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="divide-y divide-white/5" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="transition-colors hover:bg-white/[0.03] odd:bg-transparent even:bg-white/[0.015]" {...props}>
              {children}
            </tr>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-3 text-sm text-zinc-200 border-0" {...props}>
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
