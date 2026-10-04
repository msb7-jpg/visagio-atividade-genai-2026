import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimelineScrollSpy } from '../TimelineScrollSpy'

describe('TimelineScrollSpy', () => {
  const mockItems = [
    { id: 'turn-1', title: 'Top 10 Bilheterias' },
    { id: 'turn-2', title: 'Lucro Médio por Gênero' },
    { id: 'turn-3', title: 'Diretores com melhor média' }
  ]

  it('renders empty placeholder when items is empty', () => {
    render(
      <TimelineScrollSpy items={[]} activeId={null} onSelectItem={vi.fn()} />
    )
    expect(screen.getByText('Nenhuma pergunta enviada ainda')).toBeInTheDocument()
  })

  it('renders all navigation items correctly', () => {
    render(
      <TimelineScrollSpy
        items={mockItems}
        activeId="turn-1"
        onSelectItem={vi.fn()}
      />
    )

    expect(screen.getByTestId('timeline-scroll-spy')).toBeInTheDocument()
    expect(screen.getByText('Top 10 Bilheterias')).toBeInTheDocument()
    expect(screen.getByText('Lucro Médio por Gênero')).toBeInTheDocument()
    expect(screen.getByText('Diretores com melhor média')).toBeInTheDocument()
  })

  it('calls onSelectItem when an item is clicked', () => {
    const handleSelect = vi.fn()
    render(
      <TimelineScrollSpy
        items={mockItems}
        activeId="turn-1"
        onSelectItem={handleSelect}
      />
    )

    fireEvent.click(screen.getByText('Lucro Médio por Gênero'))
    expect(handleSelect).toHaveBeenCalledWith('turn-2')
  })

  it('renders collapse button and triggers onCollapse when clicked', () => {
    const handleCollapse = vi.fn()
    render(
      <TimelineScrollSpy
        items={mockItems}
        activeId="turn-1"
        onSelectItem={vi.fn()}
        onCollapse={handleCollapse}
      />
    )

    const collapseButton = screen.getByRole('button', { name: 'Recolher turnos da conversa' })
    expect(collapseButton).toBeInTheDocument()
    fireEvent.click(collapseButton)
    expect(handleCollapse).toHaveBeenCalledTimes(1)
  })
})
