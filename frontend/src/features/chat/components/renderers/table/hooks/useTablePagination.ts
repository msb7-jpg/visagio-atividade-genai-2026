import type { ParsedRow } from '@/features/chat/components/renderers/table/lib/tableParsers'
import { useMemo, useState } from 'react'

/**
 * Objeto de retorno contendo dados paginados e controles de navegação de páginas.
 */
export interface UseTablePaginationResult {
  /** Número da página atual (1-indexado). */
  currentPage: number
  /** Quantidade total de páginas calculadas. */
  totalPages: number
  /** Subconjunto de linhas correspondente à página ativa. */
  paginatedData: ParsedRow[]
  /** Navega para a página anterior, limitado ao mínimo 1. */
  goToPrevPage: () => void
  /** Navega para a próxima página, limitado ao total de páginas. */
  goToNextPage: () => void
  /** Reinicia a navegação retornando à página 1. */
  resetPage: () => void
}

/**
 * Hook para paginação em memória de linhas de tabelas.
 *
 * @param sortedData - Conjunto completo de linhas ordenadas.
 * @param pageSize - Quantidade máxima de linhas por página.
 * @returns Objeto com dados da fatia atual e funções de navegação.
 */
export function useTablePagination(sortedData: ParsedRow[], pageSize = 10): UseTablePaginationResult {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const goToPrevPage = () => {
    setCurrentPage((prevPageNumber) => Math.max(prevPageNumber - 1, 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prevPageNumber) => Math.min(prevPageNumber + 1, totalPages))
  }

  const resetPage = () => {
    setCurrentPage(1)
  }

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPrevPage,
    goToNextPage,
    resetPage
  }
}
