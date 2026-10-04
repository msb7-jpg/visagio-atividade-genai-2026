import { useAgentStream } from '@/features/chat/hooks/useAgentStream'
import { executeChatStream } from '@/features/chat/lib/chatStreamTransport'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/chat/lib/chatStreamTransport', () => ({
  executeChatStream: vi.fn()
}))

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('useAgentStream Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aciona onThreadCreated quando o evento de sessão é despachado pelo SSE', async () => {
    const mockExecute = vi.mocked(executeChatStream).mockImplementation(
      async (_payload, callbacks) => {
        callbacks.onSession('thread-nova-abc-123')
      }
    )

    const onThreadCreatedSpy = vi.fn()
    const { result } = renderHook(() => useAgentStream())

    await act(async () => {
      await result.current.sendMessage({
        message: 'Quais os diretores mais premiados?',
        onThreadCreated: onThreadCreatedSpy
      })
    })

    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(onThreadCreatedSpy).toHaveBeenCalledTimes(1)
    expect(onThreadCreatedSpy).toHaveBeenCalledWith('thread-nova-abc-123')
    expect(result.current.activeThreadId).toBe('thread-nova-abc-123')
  })

  it('passa threadId nulo quando chamada sem threadId prévio para não reutilizar thread anterior', async () => {
    const mockExecute = vi.mocked(executeChatStream).mockResolvedValue(undefined)
    const { result } = renderHook(() => useAgentStream())

    await act(async () => {
      await result.current.sendMessage({
        message: 'Pergunta enviada a partir da home vazia'
      })
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Pergunta enviada a partir da home vazia',
        threadId: null
      }),
      expect.anything(),
      expect.anything()
    )
  })

  it('reseta activeThreadId, activeTitle e mensagens ao invocar clearMessages', async () => {
    vi.mocked(executeChatStream).mockImplementation(async (_payload, callbacks) => {
      callbacks.onSession('thread-para-limpar')
      callbacks.onTitle('Título Temporário')
    })

    const { result } = renderHook(() => useAgentStream())

    await act(async () => {
      await result.current.sendMessage({ message: 'Primeira pergunta' })
    })

    expect(result.current.activeThreadId).toBe('thread-para-limpar')
    expect(result.current.activeTitle).toBe('Título Temporário')
    expect(result.current.messages.length).toBeGreaterThan(0)

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.activeThreadId).toBeNull()
    expect(result.current.activeTitle).toBeNull()
    expect(result.current.messages).toEqual([])
  })

  it('registra etapa de processamento interrompido imediatamente na mensagem ao abortar o stream', async () => {
    vi.mocked(executeChatStream).mockImplementation(async (_payload, callbacks) => {
      callbacks.onSession('thread-abort-1')
      callbacks.onEvent('step_end', {
        step: 'router',
        label: 'Classificando intenção',
        status: 'done',
        duration_ms: 120
      })
      const abortError = new Error('The user aborted a request.')
      abortError.name = 'AbortError'
      throw abortError
    })

    const { result } = renderHook(() => useAgentStream())

    await act(async () => {
      await result.current.sendMessage({ message: 'Pergunta que será cancelada' })
    })

    const assistantMsg = result.current.messages.find((msg) => msg.role === 'assistant')
    expect(assistantMsg).toBeDefined()
    expect(assistantMsg?.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ step: 'router', status: 'done' }),
        expect.objectContaining({
          step: 'interrupted',
          label: 'Processamento interrompido',
          status: 'error'
        })
      ])
    )
  })
})
