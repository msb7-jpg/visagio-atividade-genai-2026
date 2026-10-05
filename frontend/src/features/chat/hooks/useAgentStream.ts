import { chatQueryKeys } from '@/features/chat/api/threadsApi'
import { findPrecedingUserPrompt } from '@/features/chat/lib/chatHistorySearch'
import {
  applyAbortToMessage,
  applyNetworkErrorToMessage,
  applySseEventToMessage
} from '@/features/chat/lib/chatMessageReducer'
import { executeChatStream } from '@/features/chat/lib/chatStreamTransport'
import type { ChatMessageItem, ThreadDetail } from '@/features/chat/types/chat.types'
import { queryClient } from '@/lib/query-client'
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Opções de configuração para envio de uma nova mensagem.
 */
export interface SendMessageOptions {
  /** Texto da pergunta analítica enviada pelo usuário. */
  message: string
  /** Identificador opcional da thread persistida. */
  threadId?: string | null
  /** Provedor de LLM a ser utilizado. */
  provider?: string
  /** Modelo de LLM a ser utilizado. */
  model?: string
  /** Callback acionado quando uma nova thread é criada pelo backend. */
  onThreadCreated?: (threadId: string) => void
}

/**
 * Interface com todos os estados e métodos exportados pelo hook de streaming.
 */
export interface UseAgentStreamResult {
  /** Histórico completo de mensagens em exibição. */
  messages: ChatMessageItem[]
  /** Flag indicando se há uma transmissão SSE ativa no momento. */
  isStreaming: boolean
  /** Identificador da thread ativa ou nulo. */
  activeThreadId: string | null
  /** Título atual da conversa sintetizado pelo backend. */
  activeTitle: string | null
  /** Atualiza diretamente o título ativo da conversa. */
  setActiveTitle: Dispatch<SetStateAction<string | null>>
  /** Dispara o envio de uma nova pergunta para a API e consome o stream SSE. */
  sendMessage: (options: SendMessageOptions) => Promise<void>
  /** Re-executa uma mensagem do assistente localizando a pergunta anterior. */
  retryMessage: (assistantMessageId: string, options?: { provider?: string; model?: string }) => Promise<void>
  /** Aborta a transmissão SSE ativa no momento liberando o estado. */
  abortStream: () => void
  /** Verifica se a thread especificada foi explicitamente interrompida pelo usuário nesta sessão. */
  isThreadAborted: (threadId: string | null | undefined) => boolean
  /** Carrega mensagens de uma thread histórica salva no SQLite. */
  loadThreadMessages: (threadId: string, title: string, loadedMessages: ChatMessageItem[]) => void
  /** Limpa o histórico de mensagens e reseta a sessão. */
  clearMessages: () => void
}

/**
 * Atualiza um item específico na lista de mensagens sem mutação direta.
 *
 * @param list - Lista de mensagens.
 * @param id - Identificador da mensagem a ser atualizada.
 * @param updater - Função de transformação da mensagem.
 * @returns Nova lista com a mensagem transformada.
 */
function updateMessageById(
  list: ChatMessageItem[],
  id: string,
  updater: (msg: ChatMessageItem) => ChatMessageItem
): ChatMessageItem[] {
  const index = list.findIndex((msg) => msg.id === id)
  if (index === -1) return list
  return list.with(index, updater(list[index]))
}

function createOptimisticTurn(message: string, provider?: string, model?: string): {
  userMsg: ChatMessageItem
  assistantMsg: ChatMessageItem
} {
  const now = Date.now()
  return {
    userMsg: {
      id: `user-${now}`,
      role: 'user',
      content: message,
      blocks: [{ id: `block-${now}-1`, type: 'text', content: message }],
      steps: [],
      timestamp: now
    },
    assistantMsg: {
      id: `agent-${now}`,
      role: 'assistant',
      content: '',
      blocks: [],
      steps: [],
      timestamp: now,
      isStreaming: true,
      provider,
      model
    }
  }
}

function resolveIsAbortError(err: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (err instanceof Error && err.name === 'AbortError')
}

function finalizeStreamCache(
  effectiveThreadId: string | undefined,
  isAborted: boolean,
  abortedThreadIds: Set<string>
): void {
  if (isAborted) {
    if (effectiveThreadId) {
      abortedThreadIds.add(effectiveThreadId)
      void queryClient.cancelQueries({ queryKey: chatQueryKeys.threadDetail(effectiveThreadId) })
      queryClient.setQueryData<ThreadDetail | undefined>(
        chatQueryKeys.threadDetail(effectiveThreadId),
        (old) => (old ? { ...old, is_running: false } : old)
      )
    }
  } else if (effectiveThreadId) {
    void queryClient.invalidateQueries({ queryKey: chatQueryKeys.threadDetail(effectiveThreadId) })
  }

  void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
}

/**
 * Hook central de streaming SSE que orquestra a comunicação bidirecional com o agente LangGraph.
 *
 * @param initialThreadId - Identificador opcional da thread inicial.
 * @returns Objeto com o estado reativo do chat e métodos de envio e regeneração.
 */
export function useAgentStream(initialThreadId: string | null = null): UseAgentStreamResult {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeAssistantMessageIdRef = useRef<string | null>(null)
  const abortedThreadIdsRef = useRef<Set<string>>(new Set())

  const isThreadAborted = useCallback((threadId: string | null | undefined) => {
    return Boolean(threadId && abortedThreadIdsRef.current.has(threadId))
  }, [])

  const abortStream = useCallback(() => {
    setIsStreaming(false)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (activeThreadId) {
      abortedThreadIdsRef.current.add(activeThreadId)
      void queryClient.cancelQueries({ queryKey: chatQueryKeys.threadDetail(activeThreadId) })
      queryClient.setQueryData<ThreadDetail | undefined>(
        chatQueryKeys.threadDetail(activeThreadId),
        (old) => (old ? { ...old, is_running: false } : old)
      )
    }

    // Aplicação síncrona imediata da interrupção na mensagem atual (zero delay visual)
    if (activeAssistantMessageIdRef.current) {
      const targetId = activeAssistantMessageIdRef.current
      setMessages((prev) =>
        updateMessageById(prev, targetId, (msg) => ({
          ...applyAbortToMessage(msg),
          isStreaming: false
        }))
      )
    }
  }, [activeThreadId])

  const sendMessage = async ({
    message,
    threadId,
    provider,
    model,
    onThreadCreated
  }: SendMessageOptions) => {
    if (!message.trim() || isStreaming) return

    abortStream()
    const controller = new AbortController()
    abortControllerRef.current = controller

    let effectiveThreadId = threadId ?? activeThreadId
    if (effectiveThreadId) {
      abortedThreadIdsRef.current.delete(effectiveThreadId)
    }

    const { userMsg, assistantMsg } = createOptimisticTurn(message, provider, model)
    const assistantMessageId = assistantMsg.id
    activeAssistantMessageIdRef.current = assistantMessageId

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    try {
      await executeChatStream(
        {
          message,
          threadId: threadId ?? null,
          provider,
          model
        },
        {
          onSession: (newThreadId) => {
            if (controller.signal.aborted) return
            effectiveThreadId = newThreadId
            setActiveThreadId(newThreadId)
            onThreadCreated?.(newThreadId)
            void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
          },
          onTitle: (newTitle) => {
            if (controller.signal.aborted) return
            setActiveTitle(newTitle)
            void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
          },
          onEvent: (event, parsed) => {
            if (controller.signal.aborted) return
            setMessages((prev) =>
              updateMessageById(prev, assistantMessageId, (msg) =>
                applySseEventToMessage(msg, event, parsed)
              )
            )
          }
        },
        controller.signal
      )
    } catch (err: unknown) {
      if (resolveIsAbortError(err, controller.signal)) {
        setMessages((prev) =>
          updateMessageById(prev, assistantMessageId, (msg) => ({
            ...applyAbortToMessage(msg),
            isStreaming: false
          }))
        )
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Falha na comunicação com o assistente.'
        setMessages((prev) =>
          updateMessageById(prev, assistantMessageId, (msg) =>
            applyNetworkErrorToMessage(msg, errorMsg)
          )
        )
      }
    } finally {
      activeAssistantMessageIdRef.current = null
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setIsStreaming(false)
      setMessages((prev) =>
        updateMessageById(prev, assistantMessageId, (msg) => ({
          ...msg,
          isStreaming: false
        }))
      )

      finalizeStreamCache(effectiveThreadId || undefined, controller.signal.aborted, abortedThreadIdsRef.current)
    }
  }

  const retryMessage = async (
    assistantMessageId: string,
    options?: { provider?: string; model?: string }
  ) => {
    if (isStreaming) return

    const userPrompt = findPrecedingUserPrompt(messages, assistantMessageId)
    if (!userPrompt) return

    await sendMessage({
      message: userPrompt,
      threadId: activeThreadId ?? undefined,
      provider: options?.provider,
      model: options?.model
    })
  }

  const loadThreadMessages = useCallback((threadId: string, title: string, loadedMessages: ChatMessageItem[]) => {
    setActiveThreadId(threadId)
    setActiveTitle(title)
    setMessages(loadedMessages)
  }, [setActiveThreadId, setActiveTitle, setMessages])

  const clearMessages = () => {
    abortedThreadIdsRef.current.clear()
    setMessages([])
    setActiveThreadId(null)
    setActiveTitle(null)
  }

  return {
    messages,
    isStreaming,
    activeThreadId,
    activeTitle,
    setActiveTitle,
    sendMessage,
    retryMessage,
    abortStream,
    isThreadAborted,
    loadThreadMessages,
    clearMessages
  }
}

export type AgentStream = UseAgentStreamResult
