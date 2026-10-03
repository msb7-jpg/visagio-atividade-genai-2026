import { chatQueryKeys } from '@/features/chat/api/threadsApi'
import { findPrecedingUserPrompt } from '@/features/chat/lib/chatHistorySearch'
import { applyNetworkErrorToMessage, applySseEventToMessage } from '@/features/chat/lib/chatMessageReducer'
import { executeChatStream } from '@/features/chat/lib/chatStreamTransport'
import type { ChatMessageItem } from '@/features/chat/types/chat.types'
import { queryClient } from '@/lib/query-client'
import { useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Opções de configuração para envio de uma nova mensagem.
 */
export interface SendMessageOptions {
  /** Texto da pergunta analítica enviada pelo usuário. */
  message: string
  /** Identificador opcional da thread persistida. */
  threadId?: string
  /** Provedor de LLM a ser utilizado. */
  provider?: string
  /** Modelo de LLM a ser utilizado. */
  model?: string
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

  const sendMessage = async ({
    message,
    threadId,
    provider,
    model
  }: SendMessageOptions) => {
    if (!message.trim() || isStreaming) return

    const assistantMessageId = `agent-${Date.now()}`
    const userMessageId = `user-${Date.now()}`

    const userMsg: ChatMessageItem = {
      id: userMessageId,
      role: 'user',
      content: message,
      blocks: [{ id: `block-${Date.now()}-1`, type: 'text', content: message }],
      steps: [],
      timestamp: Date.now()
    }

    const assistantMsg: ChatMessageItem = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      blocks: [],
      steps: [],
      timestamp: Date.now(),
      isStreaming: true,
      provider,
      model
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    try {
      await executeChatStream(
        {
          message,
          threadId: threadId ?? activeThreadId,
          provider,
          model
        },
        {
          onSession: (newThreadId) => {
            setActiveThreadId(newThreadId)
            void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
          },
          onTitle: (newTitle) => {
            setActiveTitle(newTitle)
            void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
          },
          onEvent: (event, parsed) => {
            setMessages((prev) =>
              updateMessageById(prev, assistantMessageId, (msg) =>
                applySseEventToMessage(msg, event, parsed)
              )
            )
          }
        }
      )

      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na comunicação com o assistente.'
      setMessages((prev) =>
        updateMessageById(prev, assistantMessageId, (msg) =>
          applyNetworkErrorToMessage(msg, errorMsg)
        )
      )
    } finally {
      setIsStreaming(false)
      setMessages((prev) =>
        updateMessageById(prev, assistantMessageId, (msg) => ({
          ...msg,
          isStreaming: false
        }))
      )
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

  const loadThreadMessages = (threadId: string, title: string, loadedMessages: ChatMessageItem[]) => {
    setActiveThreadId(threadId)
    setActiveTitle(title)
    setMessages(loadedMessages)
  }

  const clearMessages = () => {
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
    loadThreadMessages,
    clearMessages
  }
}

export type AgentStream = UseAgentStreamResult
