import { Button } from '@/components/ui/button'
import { MovieTooltipCard } from '@/features/chat/components/tooltip/MovieTooltipCard'
import { cn } from '@/lib/utils'
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
import type { ReactNode } from 'react'
import { useMemo, useRef } from 'react'
import { useTableExport } from './table/hooks/useTableExport'
import { useTablePagination } from './table/hooks/useTablePagination'
import { useTableSort } from './table/hooks/useTableSort'
import { extractTableFromChildren, extractTableFromRows } from './table/lib/tableParsers'

/**
 * Propriedades para renderização da tabela rica analítica com ordenação e paginação.
 */
export interface TableRendererProps {
  /** Nós filhos React contendo a tabela HTML ou Markdown compilada. */
  children?: ReactNode
  /** Registros brutos do SQLite para renderização direta. */
  rows?: Record<string, unknown>[]
  /**
   * Quantidade de linhas por página.
   * @defaultValue `10`
   */
  pageSize?: number
  /** Classes CSS adicionais. */
  className?: string
}

/**
 * Componente de tabela rica interativa com ordenação por coluna, paginação e exportação TSV/CSV.
 *
 * @param props - Propriedades de configuração dos dados e paginação da tabela.
 * @returns Elemento JSX da tabela estilizada com barra de ferramentas e paginação.
 */
export function TableRenderer({
  children,
  rows,
  pageSize = 10,
  className
}: TableRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { headers, tableData } = useMemo(() => {
    if (rows && rows.length > 0) {
      return extractTableFromRows(rows)
    }
    if (children) {
      return extractTableFromChildren(children)
    }
    return { headers: [], tableData: [] }
  }, [rows, children])

  const { sortColIndex, sortDirection, sortedData, handleSort } = useTableSort(tableData)

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPrevPage,
    goToNextPage,
    resetPage
  } = useTablePagination(sortedData, pageSize)

  const {
    menuRef,
    isMenuOpen,
    isCopied,
    setIsMenuOpen,
    handleCopy,
    handleExportCsv
  } = useTableExport(headers, sortedData)

  const handleColumnHeaderClick = (columnIndex: number) => {
    handleSort(columnIndex)
    resetPage()
  }

  const renderSortIcon = (columnIndex: number) => {
    if (sortColIndex !== columnIndex) {
      return <ArrowUpDown className="h-3 w-3 text-subtle-foreground opacity-40 group-hover/col:opacity-100" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 text-primary" />
    }
    return <ArrowDown className="h-3 w-3 text-primary" />
  }

  if (headers.length === 0 && tableData.length === 0) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    )
  }

  const renderCellContent = (cell: string) => {
    if (!cell) {
      return <span className="text-subtle-foreground">NULL</span>
    }

    // Suporta [Título](movie:id) ou (Título)[id] dentro de células da tabela
    const movieMarkdownMatch = cell.match(/\[([^\]]+)\]\(movie:([a-zA-Z0-9_-]+)\)/)
    const movieAltMatch = cell.match(/\(([^)]+)\)\[([a-zA-Z0-9_-]+)\]/)
    const match = movieMarkdownMatch || movieAltMatch

    if (match) {
      const title = match[1]
      const movieId = match[2]
      return (
        <MovieTooltipCard movieId={movieId}>
          <span className="font-medium text-foreground/80 underline decoration-foreground/30 underline-offset-4 cursor-pointer hover:text-foreground hover:decoration-foreground/50 transition-colors">
            {title}
          </span>
        </MovieTooltipCard>
      )
    }

    return cell
  }

  return (
    <div
      ref={containerRef}
      data-testid="table-renderer-container"
      className={cn(
        'group relative my-4 overflow-hidden rounded-xl border border-border bg-sidebar shadow-lg backdrop-blur-sm',
        className
      )}
    >
      {/* Botão de menu discreto (...) no canto superior direito */}
      <div ref={menuRef} className="absolute right-2 top-2.5 z-20">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Opções da tabela"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="text-muted-foreground opacity-70 transition-opacity hover:bg-card hover:text-foreground group-hover:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {isMenuOpen ? (
          <div className="absolute right-0 mt-1 min-w-40 rounded-lg border border-border bg-card p-1 shadow-2xl backdrop-blur-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="flex w-full items-center justify-start gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-accent-emerald" />
                  <span className="text-accent-emerald">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copiar tabela</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCsv}
              className="flex w-full items-center justify-start gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        ) : null}
      </div>

      {/* Grid da Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {headers.length > 0 ? (
            <thead className="border-b border-border bg-card font-semibold text-foreground">
              <tr>
                {headers.map((header, columnIndex) => (
                  <th
                    key={columnIndex}
                    onClick={() => handleColumnHeaderClick(columnIndex)}
                    className="group/col cursor-pointer select-none px-4 py-3 text-sm font-semibold capitalize tracking-normal text-foreground transition-colors hover:text-primary"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{header}</span>
                      {renderSortIcon(columnIndex)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}

          <tbody className="divide-y border-border">
            {paginatedData.map((rowItem, rowIdx) => (
              <tr
                key={rowIdx}
                className="transition-colors hover:bg-card-hover"
              >
                {rowItem.cells.map((cell, colIdx) => (
                  <td key={colIdx} className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {renderCellContent(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Barra de Paginação inferior */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
          <span>
            Página {currentPage} de {totalPages} ({sortedData.length} registros)
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={currentPage <= 1}
              onClick={goToPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={goToNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
