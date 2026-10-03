import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TableRenderer } from '../TableRenderer'

describe('TableRenderer', () => {
  const mockRows = [
    { titulo: 'Avatar', ano: 2022, receita: 2300000000 },
    { titulo: 'Avengers', ano: 2019, receita: 2790000000 },
    { titulo: 'Spider-Man', ano: 2021, receita: 1920000000 }
  ]

  it('renders tabular data columns and cells correctly', () => {
    render(<TableRenderer rows={mockRows} />)

    expect(screen.getByText('titulo')).toBeInTheDocument()
    expect(screen.getByText('ano')).toBeInTheDocument()
    expect(screen.getByText('receita')).toBeInTheDocument()
    expect(screen.getByText('Avatar')).toBeInTheDocument()
    expect(screen.getByText('Avengers')).toBeInTheDocument()
  })

  it('sorts columns when header is clicked', () => {
    render(<TableRenderer rows={mockRows} />)

    const headerAno = screen.getByText('ano')
    // Clique 1: Ordenação asc (2019 Avengers primeiro)
    fireEvent.click(headerAno)

    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Avengers')

    // Clique 2: Ordenação desc (2022 Avatar primeiro)
    fireEvent.click(headerAno)
    const updatedRows = screen.getAllByRole('row')
    expect(updatedRows[1]).toHaveTextContent('Avatar')
  })

  it('triggers CSV download when Exportar CSV button is clicked from options menu', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    render(<TableRenderer rows={mockRows} />)

    // Abre o menu (...)
    const menuBtn = screen.getByRole('button', { name: /opções da tabela/i })
    fireEvent.click(menuBtn)

    const exportBtn = screen.getByRole('button', { name: /exportar csv/i })
    fireEvent.click(exportBtn)

    expect(createObjectURLMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test')
  })

  it('renders pagination when items exceed pageSize', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      nome: `Filme ${i + 1}`
    }))

    render(<TableRenderer rows={manyRows} pageSize={10} />)

    expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument()
    expect(screen.getByText('Filme 1')).toBeInTheDocument()
    expect(screen.queryByText('Filme 11')).not.toBeInTheDocument()

    // Avança para a página 2
    const nextBtn = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-chevron-right'))
    if (nextBtn) {
      fireEvent.click(nextBtn)
      expect(screen.getByText(/página 2 de 3/i)).toBeInTheDocument()
      expect(screen.getByText('Filme 11')).toBeInTheDocument()
    }
  })
})
