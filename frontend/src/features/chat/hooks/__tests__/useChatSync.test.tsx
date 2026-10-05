import { rehydrateThreadMessages, useChatSync } from '@/features/chat/hooks/useChatSync'
import type { AgentStream, SendMessageOptions } from '@/features/chat/hooks/useAgentStream'
import type { ChatMessageItem, ThreadDetail } from '@/features/chat/types/chat.types'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('@/features/chat/hooks/useThreadDetailQuery', () => ({
  useThreadDetailQuery: vi.fn().mockReturnValue({ data: undefined })
}))

vi.mock('@/features/settings/hooks/useProviderConfigQuery', () => ({
  useProviderConfigQuery: vi.fn().mockReturnValue({
    config: { provider: 'groq', model: 'llama-3.3-70b-versatile' }
  })
}))

describe('useChatSync Hook', () => {
  let mockStream: AgentStream
  let mockSendMessage: Mock<(options: SendMessageOptions) => Promise<void>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMessage = vi.fn<(options: SendMessageOptions) => Promise<void>>().mockResolvedValue(undefined)

    mockStream = {
      messages: [],
      isStreaming: false,
      activeThreadId: null,
      activeTitle: null,
      setActiveTitle: vi.fn(),
      sendMessage: mockSendMessage,
      retryMessage: vi.fn(),
      abortStream: vi.fn(),
      isThreadAborted: vi.fn().mockReturnValue(false),
      loadThreadMessages: vi.fn(),
      clearMessages: vi.fn()
    }
  })

  it('notifica onActiveThreadChange quando onThreadCreated é disparado no envio de nova mensagem', () => {
    const onActiveThreadChangeSpy = vi.fn()

    const { result } = renderHook(() =>
      useChatSync({
        stream: mockStream,
        externalThreadId: null,
        onActiveThreadChange: onActiveThreadChangeSpy
      })
    )

    act(() => {
      result.current.handleSend('Nova pergunta analítica')
    })

    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    const passedOptions = mockSendMessage.mock.calls[0][0] as SendMessageOptions

    expect(passedOptions.message).toBe('Nova pergunta analítica')
    expect(passedOptions.threadId).toBeNull()

    // Simula a chegada do evento 'session' com o novo thread_id
    act(() => {
      passedOptions.onThreadCreated?.('thread-gerada-pelo-backend-999')
    })

    expect(onActiveThreadChangeSpy).toHaveBeenCalledWith('thread-gerada-pelo-backend-999')
  })

  it('mantém as mensagens visíveis da stream após o término do streaming quando a thread coincide', () => {
    const streamMsgs: ChatMessageItem[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'Top 5 diretores',
        blocks: [{ id: 'b1', type: 'text', content: 'Top 5 diretores' }],
        steps: [],
        timestamp: Date.now()
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Aqui está a lista...',
        blocks: [{ id: 'b2', type: 'text', content: 'Aqui está a lista...' }],
        steps: [],
        timestamp: Date.now()
      }
    ]

    mockStream = {
      ...mockStream,
      messages: streamMsgs,
      activeThreadId: 'thread-sincronizada-123',
      isStreaming: false // Streaming já finalizou
    }

    const { result } = renderHook(() =>
      useChatSync({
        stream: mockStream,
        externalThreadId: 'thread-sincronizada-123' // URL já sincronizada
      })
    )

    // Não deve esvaziar a tela para [] pois streamOwnsView é verdadeiro
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].content).toBe('Top 5 diretores')
    expect(result.current.messages[1].content).toBe('Aqui está a lista...')
  })

  it('reidrata mensagens persistidas preservando steps exatos do backend sem gerar etapas fictícias', () => {
    const threadDetail: ThreadDetail = {
      thread_id: 'thread-detalhe-1',
      title: 'Top Filmes',
      created_at: 1000,
      updated_at: 2000,
      messages: [
        {
          id: 'u-1',
          role: 'user',
          content: 'Qual o maior filme?'
        },
        {
          id: 'a-1',
          role: 'assistant',
          content: 'O maior filme é Avatar.',
          steps: [
            { step: 'router', label: 'Classificando intenção', status: 'done', duration_ms: 100 },
            { step: 'sql_generator', label: 'Escrevendo consulta SQL', status: 'done', duration_ms: 800 }
          ],
          thought: '[Escrevendo consulta SQL]\nFiltrando por bilheteria'
        }
      ]
    }

    const rehydrated = rehydrateThreadMessages(threadDetail)
    expect(rehydrated).toHaveLength(2)
    const assistantMsg = rehydrated[1]
    expect(assistantMsg.steps).toHaveLength(2)
    expect(assistantMsg.steps[0].step).toBe('router')
    expect(assistantMsg.steps[1].step).toBe('sql_generator')
  })

  it('mantém steps vazio quando a mensagem não possui steps gravados no backend', () => {
    const threadDetail: ThreadDetail = {
      thread_id: 'thread-sem-steps',
      title: 'Sem steps',
      created_at: 1000,
      updated_at: 2000,
      messages: [
        {
          id: 'u-1',
          role: 'user',
          content: 'Olá'
        },
        {
          id: 'a-1',
          role: 'assistant',
          content: 'Olá! Como posso ajudar?'
        }
      ]
    }

    const rehydrated = rehydrateThreadMessages(threadDetail)
    expect(rehydrated[1].steps).toEqual([])
  })

  it('suprime placeholder em loading e não bloqueia a interface quando a thread está marcada como abortada', () => {
    const threadDetail: ThreadDetail = {
      thread_id: 'thread-abortada-123',
      title: 'Consulta Cancelada',
      created_at: 1000,
      updated_at: 2000,
      is_running: true, // Backend ainda não desalocou
      messages: [
        {
          id: 'u-1',
          role: 'user',
          content: 'Pergunta longa'
        }
      ]
    }

    // rehydrateThreadMessages com isAborted=true não deve adicionar placeholder
    const rehydrated = rehydrateThreadMessages(threadDetail, true)
    expect(rehydrated).toHaveLength(1)
    expect(rehydrated[0].role).toBe('user')
  })
})
