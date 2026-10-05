import { executeChatStream } from '@/features/chat/lib/chatStreamTransport'
import { apiFetch } from '@/lib/api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn()
}))

describe('executeChatStream Transport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lança AbortError antes do fetch se signal já estiver abortado', async () => {
    const controller = new AbortController()
    controller.abort()

    const onSession = vi.fn()
    const onTitle = vi.fn()
    const onEvent = vi.fn()

    await expect(
      executeChatStream(
        { message: 'Teste abort antecipado' },
        { onSession, onTitle, onEvent },
        controller.signal
      )
    ).rejects.toThrowError()

    expect(apiFetch).not.toHaveBeenCalled()
    expect(onSession).not.toHaveBeenCalled()
  })

  it('consome stream com sucesso e aciona callbacks de ciclo de vida', async () => {
    const encoder = new TextEncoder()
    const rawChunks = [
      'event: session\ndata: {"thread_id": "thread-123"}\n\n',
      'event: title\ndata: {"title": "Conversa de Cinema"}\n\n',
      'event: token\ndata: {"content": "Olá!"}\n\n'
    ]

    const stream = new ReadableStream({
      start(ctrl) {
        for (const chunk of rawChunks) {
          ctrl.enqueue(encoder.encode(chunk))
        }
        ctrl.close()
      }
    })

    const mockResponse = new Response(stream, { status: 200 })
    vi.mocked(apiFetch).mockResolvedValue(mockResponse)

    const onSession = vi.fn()
    const onTitle = vi.fn()
    const onEvent = vi.fn()

    await executeChatStream(
      { message: 'Pergunta de teste', threadId: 't1' },
      { onSession, onTitle, onEvent }
    )

    expect(onSession).toHaveBeenCalledWith('thread-123')
    expect(onTitle).toHaveBeenCalledWith('Conversa de Cinema')
    expect(onEvent).toHaveBeenCalledWith('token', { content: 'Olá!' })
  })

  it('interrompe imediatamente e lança AbortError quando o sinal é acionado durante iteração', async () => {
    const controller = new AbortController()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('event: token\ndata: {"content": "Chunk 1"}\n\n'))
      }
    })

    const mockResponse = new Response(stream, { status: 200 })
    vi.mocked(apiFetch).mockResolvedValue(mockResponse)

    const onEvent = vi.fn().mockImplementation(() => {
      controller.abort()
    })

    await expect(
      executeChatStream(
        { message: 'Pergunta cancelada' },
        { onSession: vi.fn(), onTitle: vi.fn(), onEvent },
        controller.signal
      )
    ).rejects.toThrow('The user aborted a request.')

    expect(onEvent).toHaveBeenCalledTimes(1)
  })
})
