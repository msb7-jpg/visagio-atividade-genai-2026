import { chatQueryKeys } from '@/features/chat/api/threadsApi'
import { applyNetworkErrorToMessage, applySseEventToMessage } from '@/features/chat/lib/chatMessageReducer'
import { parseSseStream } from '@/features/chat/lib/sseStreamParser'
import type { ChatMessageItem } from '@/features/chat/types/chat.types'
import { apiFetch } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { useState } from 'react'

interface SendMessageOptions {
  message: string
  threadId?: string
  provider?: string
  model?: string
  existingAssistantId?: string
}

function updateMessageById(
  list: ChatMessageItem[],
  id: string,
  updater: (msg: ChatMessageItem) => ChatMessageItem
): ChatMessageItem[] {
  const index = list.findIndex((msg) => msg.id === id)
  if (index === -1) return list
  return list.with(index, updater(list[index]))
}

export function useAgentStream(initialThreadId: string | null = null) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)

  const sendMessage = async ({
    message,
    threadId,
    provider,
    model,
    existingAssistantId
  }: SendMessageOptions) => {
    if (!message.trim() || isStreaming) return

    const assistantMessageId = existingAssistantId ?? `agent-${Date.now()}`

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

    if (!existingAssistantId) {
      const userMessageId = `user-${Date.now()}`
      const userMsg: ChatMessageItem = {
        id: userMessageId,
        role: 'user',
        content: message,
        blocks: [{ id: `block-${Date.now()}-1`, type: 'text', content: message }],
        steps: [],
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, userMsg, assistantMsg])
    } else {
      // No caso de retry, anexa apenas a nova tentativa de resposta do assistente
      setMessages((prev) => [...prev, assistantMsg])
    }

    setIsStreaming(true)

    try {
      const targetThreadId = threadId ?? activeThreadId
      const response = await apiFetch('/chat/stream', {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream'
        },
        body: {
          message,
          thread_id: targetThreadId,
          provider,
          model
        }
      })

      if (!response.body) {
        throw new Error('Servidor retornou resposta sem corpo de stream.')
      }

      for await (const { event, data } of parseSseStream(response)) {
        try {
          const parsed = JSON.parse(data)

          if (event === 'session' && parsed.thread_id) {
            setActiveThreadId(parsed.thread_id)
            // Invalida a lista para a nova conversa aparecer na barra lateral
            void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
          }

          if (event === 'title' && parsed.title) {
            setActiveTitle(parsed.title)
            void queryClient.invalidateQueries({ queryKey: chatQueryKeys.allThreads() })
          }

          setMessages((prev) =>
            updateMessageById(prev, assistantMessageId, (msg) =>
              applySseEventToMessage(msg, event, parsed)
            )
          )
        } catch {
          // Ignora payloads não-JSON
        }
      }

      // Ao finalizar com sucesso, garante que os dados da thread estejam frescos na sidebar
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

    const assistantIndex = messages.findIndex((msg) => msg.id === assistantMessageId)
    if (assistantIndex === -1) return

    // Encontra a pergunta original do usuário associada
    let userPrompt = ''
    for (let index = assistantIndex - 1; index >= 0; index--) {
      if (messages[index].role === 'user') {
        userPrompt = messages[index].content
        break
      }
    }

    if (!userPrompt) return

    // Remove APENAS a resposta do assistente (e eventuais turnos posteriores),
    // mantendo a pergunta do usuário intacta (FENCING contra duplicação)
    const pruned = messages.slice(0, assistantIndex)
    setMessages(pruned)

    // Dispara nova tentativa passando existingAssistantId para não recriar a mensagem de usuário
    await sendMessage({
      message: userPrompt,
      threadId: activeThreadId ?? undefined,
      provider: options?.provider,
      model: options?.model,
      existingAssistantId: `agent-${Date.now()}`
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
