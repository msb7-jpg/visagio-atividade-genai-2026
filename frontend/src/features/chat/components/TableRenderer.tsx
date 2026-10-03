import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useClickAway, useCopyToClipboard } from '@reactuses/core'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MoreHorizontal
} from 'lucide-react'
import { Children, isValidElement, ReactNode, useMemo, useRef, useState } from 'react'

export interface TableRendererProps {
  rows?: Record<string, unknown>[]
  children?: ReactNode
  pageSize?: number
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

interface ExtractedRow {
  cells: string[]
}

export function TableRenderer({
  rows,
  children,
  pageSize = 10,
  className
}: TableRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()

  const [currentPage, setCurrentPage] = useState(1)
  const [sortColIndex, setSortColIndex] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  useClickAway(menuRef, () => {
    setIsMenuOpen(false)
  })

  // 1. Extração uniforme de Headers e Linhas, seja vindo de props.rows ou de markdown JSX (children)
  const { headers, tableData } = useMemo(() => {
    if (rows && rows.length > 0) {
      const keys = Object.keys(rows[0])
      const extracted: ExtractedRow[] = rows.map((row) => ({
        cells: keys.map((k) => (row[k] !== null && row[k] !== undefined ? String(row[k]) : ''))
      }))
      return { headers: keys, tableData: extracted }
    }

    // Se veio via children de ReactMarkdown (thead/tbody/tr/th/td)
    const headerList: string[] = []
    const rowList: ExtractedRow[] = []

    const extractText = (node: ReactNode): string => {
      if (typeof node === 'string' || typeof node === 'number') {
        return String(node).trim()
      }
      if (Array.isArray(node)) {
        return node.map(extractText).join('')
      }
      if (isValidElement(node) && node.props && 'children' in (node.props as Record<string, unknown>)) {
        return extractText((node.props as { children?: ReactNode }).children)
      }
      return ''
    }

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return
      const childType = (child.type as { name?: string })?.name || String(child.type)

      // thead
      if (childType === 'thead' || child.type === 'thead') {
        const theadChildren = (child.props as { children?: ReactNode }).children
        Children.forEach(theadChildren, (trNode) => {
          if (!isValidElement(trNode)) return
          const trProps = trNode.props as { children?: ReactNode }
          Children.forEach(trProps.children, (thNode) => {
            if (!isValidElement(thNode)) return
            headerList.push(extractText((thNode.props as { children?: ReactNode }).children))
          })
        })
      }

      // tbody
      if (childType === 'tbody' || child.type === 'tbody') {
        const tbodyChildren = (child.props as { children?: ReactNode }).children
        Children.forEach(tbodyChildren, (trNode) => {
          if (!isValidElement(trNode)) return
          const trProps = trNode.props as { children?: ReactNode }
          const cells: string[] = []
          Children.forEach(trProps.children, (tdNode) => {
            if (!isValidElement(tdNode)) return
            cells.push(extractText((tdNode.props as { children?: ReactNode }).children))
          })
          if (cells.length > 0) {
            rowList.push({ cells })
          }
        })
      }
    })

    return { headers: headerList, tableData: rowList }
  }, [rows, children])

  // 2. Ordenação
  const sortedData = useMemo(() => {
    if (sortColIndex === null || !sortDirection) return tableData

    return [...tableData].sort((a, b) => {
      const valA = a.cells[sortColIndex] ?? ''
      const valB = b.cells[sortColIndex] ?? ''

      const numA = Number(valA.replace(/[^0-9.-]+/g, ''))
      const numB = Number(valB.replace(/[^0-9.-]+/g, ''))
      const isNumComparison = !isNaN(numA) && !isNaN(numB) && valA.trim() !== '' && valB.trim() !== ''

      if (isNumComparison) {
        return sortDirection === 'asc' ? numA - numB : numB - numA
      }

      return sortDirection === 'asc'
        ? valA.localeCompare(valB, undefined, { numeric: true })
        : valB.localeCompare(valA, undefined, { numeric: true })
    })
  }, [tableData, sortColIndex, sortDirection])

  // 3. Paginação (padrão 10 elementos)
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize
    return sortedData.slice(startIdx, startIdx + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (idx: number) => {
    if (sortColIndex !== idx) {
      setSortColIndex(idx)
      setSortDirection('asc')
    } else if (sortDirection === 'asc') {
      setSortDirection('desc')
    } else {
      setSortColIndex(null)
      setSortDirection(null)
    }
    setCurrentPage(1)
  }

  // 4. Copiar para Clipboard (TSV)
  const handleCopy = () => {
    const headerLine = headers.join('\t')
    const lines = sortedData.map((row) => row.cells.join('\t'))
    const tsvContent = [headerLine, ...lines].filter(Boolean).join('\n')

    copyToClipboard(tsvContent)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
      setIsMenuOpen(false)
    }, 1500)
  }

  // 5. Exportar CSV
  const handleExportCsv = () => {
    const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';')
    const lines = sortedData.map((row) =>
      row.cells.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(';')
    )
    const csvContent = '\uFEFF' + [headerLine, ...lines].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `cinedata-export-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setIsMenuOpen(false)
  }

  const renderSortIcon = (idx: number) => {
    if (sortColIndex !== idx) {
      return <ArrowUpDown className="size-3 text-zinc-500 opacity-40 group-hover/col:opacity-100" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="size-3 text-[#FF5E2B]" />
    }
    return <ArrowDown className="size-3 text-[#FF5E2B]" />
  }

  if (headers.length === 0 && tableData.length === 0) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-testid="table-renderer-container"
      className={cn(
        'group relative my-4 overflow-hidden rounded-xl border border-white/10 bg-[#13171E]/60 shadow-lg backdrop-blur-sm',
        className
      )}
    >
      {/* Botão de menu discreto (...) no canto superior direito */}
      <div ref={menuRef} className="absolute right-2 top-2.5 z-20">
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
          <div className="absolute right-0 mt-1 min-w-[150px] rounded-lg border border-white/10 bg-[#1B202B] p-1 shadow-2xl backdrop-blur-md">
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

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCsv}
              className="flex w-full items-center justify-start gap-2 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/5 hover:text-white"
            >
              <Download className="size-3.5 text-[#FF5E2B]" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        ) : null}
      </div>

      {/* Grid da Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {headers.length > 0 && (
            <thead className="border-b border-white/10 bg-[#1B202B]/90 font-semibold text-zinc-300">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    className="group/col cursor-pointer select-none px-4 py-3 text-sm font-semibold capitalize tracking-normal text-zinc-200 transition-colors hover:text-white"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{header}</span>
                      {renderSortIcon(idx)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody className="divide-y divide-white/5">
            {paginatedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="transition-colors odd:bg-transparent even:bg-white/[0.015] hover:bg-white/[0.03]"
              >
                {row.cells.map((cell, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 text-sm text-zinc-200 whitespace-nowrap">
                    {cell !== '' ? cell : <span className="text-zinc-600">NULL</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginação inferior (só exibe se total de itens > pageSize) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 bg-[#1B202B]/40 px-4 py-2 text-xs text-zinc-400">
          <span>
            Página {currentPage} de {totalPages} ({sortedData.length} registros)
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="size-7 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="size-7 p-0 text-zinc-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
