import { useSlashCommandsController } from '@/features/chat/components/input/useSlashCommandsController'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('useSlashCommandsController Hook', () => {
  it('inicializa com valores vazios e abre menu quando o usuário digita /', () => {
    const onSendMock = vi.fn()
    const { result } = renderHook(() =>
      useSlashCommandsController({ onSendMessage: onSendMock, isDisabled: false })
    )

    expect(result.current.text).toBe('')
    expect(result.current.activeCommand).toBeNull()
    expect(result.current.showCommandMenu).toBe(false)

    act(() => {
      result.current.handleInputChange('/')
    })

    expect(result.current.showCommandMenu).toBe(true)
    expect(result.current.filteredCommands.length).toBeGreaterThan(0)
  })

  it('converte automaticamente comando seguido de espaço em pill', () => {
    const onSendMock = vi.fn()
    const { result } = renderHook(() =>
      useSlashCommandsController({ onSendMessage: onSendMock, isDisabled: false })
    )

    act(() => {
      result.current.handleInputChange('/chart pizza')
    })

    expect(result.current.activeCommand).toBe('/chart')
    expect(result.current.text).toBe('pizza')
  })

  it('consolida comando ativo e texto ao invocar handleSend', () => {
    const onSendMock = vi.fn()
    const { result } = renderHook(() =>
      useSlashCommandsController({ onSendMessage: onSendMock, isDisabled: false })
    )

    act(() => {
      result.current.selectCommand('/chart')
    })
    expect(result.current.activeCommand).toBe('/chart')

    act(() => {
      result.current.handleInputChange('receita por genero')
    })

    act(() => {
      result.current.handleSend()
    })

    expect(onSendMock).toHaveBeenCalledWith('/chart receita por genero')
    expect(result.current.text).toBe('')
    expect(result.current.activeCommand).toBeNull()
  })

  it('alterna o menu de comandos ao chamar toggleMenu', () => {
    const onSendMock = vi.fn()
    const { result } = renderHook(() =>
      useSlashCommandsController({ onSendMessage: onSendMock, isDisabled: false })
    )

    expect(result.current.isMenuOpenExplicit).toBe(false)

    act(() => {
      result.current.toggleMenu()
    })

    expect(result.current.isMenuOpenExplicit).toBe(true)
    expect(result.current.showCommandMenu).toBe(true)
  })
})
