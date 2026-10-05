import { Children, isValidElement, type ReactNode } from 'react'

/**
 * Linha de tabela parseada contendo células em string.
 */
export interface ParsedRow {
  /** Valores textuais das colunas correspondentes nesta linha. */
  cells: string[]
}

/**
 * Estrutura tabular normalizada contendo cabeçalhos e linhas.
 */
export interface ParsedTableData {
  /** Nomes das colunas da tabela. */
  headers: string[]
  /** Linhas de dados contendo as células textuais. */
  tableData: ParsedRow[]
}

/**
 * Extrai cabeçalhos e células a partir de uma lista de registros chave-valor do SQLite.
 *
 * @param rows - Lista de dicionários de dados analíticos.
 * @returns Estrutura normalizada ParsedTableData com headers e tableData.
 */
export function extractTableFromRows(rows: Record<string, unknown>[]): ParsedTableData {
  if (rows.length === 0) {
    return { headers: [], tableData: [] }
  }

  const headers = Object.keys(rows[0])
  const tableData: ParsedRow[] = rows.map((rowRecord) => ({
    cells: headers.map((headerKey) => (
      rowRecord[headerKey] !== undefined && rowRecord[headerKey] !== null
        ? String(rowRecord[headerKey])
        : ''
    ))
  }))

  return { headers, tableData }
}

/**
 * Extrai recursivamente o texto contido em nós JSX ou arrays de ReactNode,
 * preservando a sintaxe de links Markdown [texto](href) quando presentes.
 *
 * @param node - Nó React a ser inspecionado.
 * @returns String consolidada com links markdown preservados.
 */
function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('')
  }
  if (isValidElement(node)) {
    const props = node.props as Record<string, unknown>
    const childrenText = props.children ? extractText(props.children as ReactNode) : ''

    // Preserva links no formato Markdown [texto](href)
    if (typeof props.href === 'string') {
      return `[${childrenText}](${props.href})`
    }

    // Suporte caso seja um MovieTooltipCard já instanciado diretamente com prop movieId
    if (typeof props.movieId === 'string') {
      return `[${childrenText}](movie:${props.movieId})`
    }

    return childrenText
  }
  return ''
}

/**
 * Analisa os nós filhos JSX de uma tabela Markdown (thead, tbody, tr, th, td) e constrói a estrutura tabular.
 *
 * @param children - Elementos filhos ReactNode da tag table.
 * @returns Estrutura normalizada com cabeçalhos e linhas.
 */
export function extractTableFromChildren(children: ReactNode): ParsedTableData {
  const headers: string[] = []
  const tableData: ParsedRow[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const childType = (child.type as { name?: string })?.name || String(child.type)

    if (childType === 'thead' || child.type === 'thead') {
      const theadChildren = (child.props as { children?: ReactNode }).children
      Children.forEach(theadChildren, (trNode) => {
        if (!isValidElement(trNode)) return
        const trProps = trNode.props as { children?: ReactNode }
        Children.forEach(trProps.children, (thNode) => {
          if (!isValidElement(thNode)) return
          headers.push(extractText((thNode.props as { children?: ReactNode }).children).trim())
        })
      })
    }

    if (childType === 'tbody' || child.type === 'tbody') {
      const tbodyChildren = (child.props as { children?: ReactNode }).children
      Children.forEach(tbodyChildren, (trNode) => {
        if (!isValidElement(trNode)) return
        const trProps = trNode.props as { children?: ReactNode }
        const cells: string[] = []
        Children.forEach(trProps.children, (tdNode) => {
          if (!isValidElement(tdNode)) return
          cells.push(extractText((tdNode.props as { children?: ReactNode }).children).trim())
        })
        if (cells.length > 0) {
          tableData.push({ cells })
        }
      })
    }
  })

  return { headers, tableData }
}
