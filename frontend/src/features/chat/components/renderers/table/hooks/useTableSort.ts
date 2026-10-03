import type { ParsedRow } from '@/features/chat/components/renderers/table/lib/tableParsers'
import { useMemo, useState } from 'react'

/** Sentido de ordenação da coluna: ascendente ou descendente. */
export type SortDirection = 'asc' | 'desc'

/**
 * Resultado do hook de ordenação tabular.
 */
export interface UseTableSortResult {
  /** Índice da coluna atualmente ordenada ou nulo caso não haja ordenação ativa. */
  sortColIndex: number | null
  /** Direção atual da ordenação ('asc' ou 'desc'). */
  sortDirection: SortDirection
  /** Lista ordenada de linhas. */
  sortedData: ParsedRow[]
  /** Alterna a ordenação na coluna especificada (ascendente -\> descendente -\> limpar). */
  handleSort: (columnIndex: number) => void
}

/**
 * Hook para ordenação inteligente (numérica ou textual alfabética) em colunas de tabelas.
 *
 * @param tableData - Linhas brutas da tabela.
 * @returns Objeto com coluna ordenada, direção, dados ordenados e função de alternância.
 */
export function useTableSort(tableData: ParsedRow[]): UseTableSortResult {
  const [sortColIndex, setSortColIndex] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedData = useMemo(() => {
    if (sortColIndex === null) return tableData

    return [...tableData].sort((rowA, rowB) => {
      const valA = rowA.cells[sortColIndex] || ''
      const valB = rowB.cells[sortColIndex] || ''

      const numA = Number(valA.replace(/[^0-9.-]+/g, ''))
      const numB = Number(valB.replace(/[^0-9.-]+/g, ''))

      if (!Number.isNaN(numA) && !Number.isNaN(numB) && valA !== '' && valB !== '') {
        return sortDirection === 'asc' ? numA - numB : numB - numA
      }

      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA)
    })
  }, [tableData, sortColIndex, sortDirection])

  const handleSort = (columnIndex: number) => {
    if (sortColIndex === columnIndex) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortColIndex(null)
        setSortDirection('asc')
      }
    } else {
      setSortColIndex(columnIndex)
      setSortDirection('asc')
    }
  }

  return {
    sortColIndex,
    sortDirection,
    sortedData,
    handleSort
  }
}
