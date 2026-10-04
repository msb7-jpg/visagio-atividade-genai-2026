import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppLayout } from '@/components/layouts/AppLayout'
import { Button } from '@/components/ui/button'

describe('AppLayout', () => {
  it('renders sidebar and main elements', () => {
    render(
      <AppLayout>
        <div data-testid="chat-content">Conteúdo do Chat</div>
      </AppLayout>
    )

    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('app-main')).toBeInTheDocument()
    expect(screen.getByTestId('chat-content')).toHaveTextContent('Conteúdo do Chat')
  })

  it('triggers onNewChat callback when Novo Chat button is clicked', () => {
    const handleNewChat = vi.fn()
    render(<AppLayout onNewChat={handleNewChat} />)

    const newChatButton = screen.getByRole('button', { name: 'Novo Chat' })
    fireEvent.click(newChatButton)

    expect(handleNewChat).toHaveBeenCalledTimes(1)
  })

  it('triggers onOpenSettings callback when settings button is clicked', () => {
    const handleOpenSettings = vi.fn()
    render(<AppLayout onOpenSettings={handleOpenSettings} />)

    const settingsButtons = screen.getAllByRole('button', { name: /configurações/i })
    expect(settingsButtons.length).toBeGreaterThan(0)
    fireEvent.click(settingsButtons[0])

    expect(handleOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('collapses and expands sidebar when logo toggle button is clicked', () => {
    render(<AppLayout />)

    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar).toHaveClass('w-64')

    const collapseButton = screen.getByRole('button', { name: 'Recolher menu lateral' })
    fireEvent.click(collapseButton)

    expect(sidebar).toHaveClass('w-16')
    expect(screen.getByRole('button', { name: 'Novo Chat' })).toBeInTheDocument()

    const expandButton = screen.getByRole('button', { name: 'Expandir menu lateral' })
    fireEvent.click(expandButton)

    expect(sidebar).toHaveClass('w-64')
  })

  it('collapses right sidebar and displays floating button to re-open it', () => {
    function DummyTimeline({ onCollapse }: { onCollapse?: () => void }) {
      return (
        <div>
          <span>Timeline Content</span>
          <Button type="button" onClick={onCollapse}>
            Recolher Timeline
          </Button>
        </div>
      )
    }

    render(<AppLayout rightSidebarContent={<DummyTimeline />} />)

    const rightSidebar = screen.getByTestId('app-right-sidebar')
    expect(rightSidebar).toHaveClass('w-64')

    // Click collapse button inside timeline
    fireEvent.click(screen.getByRole('button', { name: 'Recolher Timeline' }))

    // Right sidebar is collapsed to w-0
    expect(rightSidebar).toHaveClass('w-0')

    // Floating expand button appears
    const expandTimelineButton = screen.getByRole('button', { name: 'Expandir turnos da conversa' })
    expect(expandTimelineButton).toBeInTheDocument()

    // Click floating expand button
    fireEvent.click(expandTimelineButton)

    // Right sidebar is expanded back to w-64
    expect(rightSidebar).toHaveClass('w-64')
    expect(screen.queryByRole('button', { name: 'Expandir turnos da conversa' })).not.toBeInTheDocument()
  })
})
