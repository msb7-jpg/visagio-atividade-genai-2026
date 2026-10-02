import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppLayout } from '@/components/layouts/AppLayout'

describe('AppLayout', () => {
  it('renders sidebar, header and main elements', () => {
    render(
      <AppLayout>
        <div data-testid="chat-content">Conteúdo do Chat</div>
      </AppLayout>
    )

    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('app-header')).toBeInTheDocument()
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

  it('collapses sidebar to icon-only mode when toggle button is clicked', () => {
    render(<AppLayout />)

    const sidebar = screen.getByTestId('app-sidebar')
    expect(sidebar).toHaveClass('w-64')

    const toggleButton = screen.getByRole('button', { name: 'Recolher menu lateral' })
    fireEvent.click(toggleButton)

    expect(sidebar).toHaveClass('w-16')
    expect(screen.getByRole('button', { name: 'Novo Chat' })).toBeInTheDocument()
  })
})
