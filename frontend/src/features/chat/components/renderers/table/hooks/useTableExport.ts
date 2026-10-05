import type { ParsedRow } from '@/features/chat/components/renderers/table/lib/tableParsers'
import { useCopyToClipboard } from '@reactuses/core'
import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'

/**
 * Objeto de retorno do hook de exportação de tabelas.
 */
export interface UseTableExportResult {
  /** Referência do container do menu de exportação para fechamento ao clicar fora. */
  menuRef: RefObject<HTMLDivElement | null>
  /** Estado de visibilidade do menu de exportação. */
  isMenuOpen: boolean
  /** Indicador transitório se o conteúdo foi copiado recentemente para a área de transferência. */
  isCopied: boolean
  /** Função de atualização do estado de abertura do menu. */
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>
  /** Copia os dados tabulares em formato TSV (compatível com Excel/Sheets). */
  handleCopy: () => void
  /** Exporta e inicia o download da tabela em arquivo CSV. */
  handleExportCsv: () => void
}

/**
 * Hook para gerenciar cópia para a área de transferência (TSV) e download em CSV de dados tabulares.
 *
 * @param headers - Lista de nomes das colunas da tabela.
 * @param sortedData - Linhas de dados ordenadas a serem exportadas.
 * @returns Objeto com referências, estados do menu e métodos de exportação.
 */
export function useTableExport(headers: string[], sortedData: ParsedRow[]): UseTableExportResult {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [, copyToClipboard] = useCopyToClipboard()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const cleanCellForExport = (cell: string) =>
    cell
      .replace(/\[([^\]]+)\]\(movie:[^)]+\)/g, '$1')
      .replace(/\(([^)]+)\)\[[^\]]+\]/g, '$1')

  const handleCopy = () => {
    if (headers.length === 0 && sortedData.length === 0) return
    const headerLine = headers.join('\t')
    const bodyLines = sortedData
      .map((rowItem) => rowItem.cells.map(cleanCellForExport).join('\t'))
      .join('\n')
    const tsv = `${headerLine}\n${bodyLines}`

    copyToClipboard(tsv)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
      setIsMenuOpen(false)
    }, 1500)
  }

  const handleExportCsv = () => {
    if (headers.length === 0 && sortedData.length === 0) return
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`
    const headerLine = headers.map(escapeCsv).join(',')
    const bodyLines = sortedData
      .map((rowItem) => rowItem.cells.map((cell) => escapeCsv(cleanCellForExport(cell))).join(','))
      .join('\n')
    const csvContent = `${headerLine}\n${bodyLines}`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `tabela_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setIsMenuOpen(false)
  }

  return {
    menuRef,
    isMenuOpen,
    isCopied,
    setIsMenuOpen,
    handleCopy,
    handleExportCsv
  }
}
