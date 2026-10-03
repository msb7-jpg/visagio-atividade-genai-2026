import type { ThreadSummary } from '@/features/chat/types/chat.types'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarThreads } from '../SidebarThreads'

describe('SidebarThreads', () => {
  const mockThreads: ThreadSummary[] = [
    {
      thread_id: 't-1',
      title: 'Ranking de Atores',
      created_at: 1000,
      updated_at: 2000
    },
    {
      thread_id: 't-2',
      title: 'Evolução de Notas IMDb',
      created_at: 1000,
      updated_at: 3000
    }
  ]

  it('renders threads list and handles thread selection', () => {
    const handleSelect = vi.fn()
    const handleDelete = vi.fn()

    render(
      <SidebarThreads
        threads={mockThreads}
        activeThreadId="t-1"
        onSelectThread={handleSelect}
        onDeleteThread={handleDelete}
      />
    )

    expect(screen.getByText('Ranking de Atores')).toBeInTheDocument()
    expect(screen.getByText('Evolução de Notas IMDb')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Evolução de Notas IMDb'))
    expect(handleSelect).toHaveBeenCalledWith('t-2')
  })

  it('handles delete thread action', () => {
    const handleDelete = vi.fn()

    render(
      <SidebarThreads
        threads={mockThreads}
        activeThreadId="t-1"
        onNewChat={vi.fn()}
        onSelectThread={vi.fn()}
        onDeleteThread={handleDelete}
      />
    )

    const deleteButtons = screen.getAllByTitle('Excluir conversa')
    expect(deleteButtons).toHaveLength(2)

    fireEvent.click(deleteButtons[0])
    expect(handleDelete).toHaveBeenCalledWith('t-1')
  })
})
