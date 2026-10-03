import { applyNetworkErrorToMessage, applySseEventToMessage } from '@/features/chat/lib/chatMessageReducer'
import { parseSseStream } from '@/features/chat/lib/sseStreamParser'
import type { ChatMessageItem } from '@/features/chat/types/chat.types'
import { apiFetch } from '@/lib/api-client'
import { useState } from 'react'

interface SendMessageOptions {
  message: string
  threadId?: string
  provider?: string
  model?: string
}

function updateMessageById(
  list: ChatMessageItem[],
  id: string,
  updater: (msg: ChatMessageItem) => ChatMessageItem
): ChatMessageItem[] {
  const index = list.findIndex(msg => msg.id === id)
  if (index === -1) return list
  return list.with(index, updater(list[index]))
}

export function useAgentStream() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  const sendMessage = async ({ message, threadId, provider, model }: SendMessageOptions) => {
    if (!message.trim() || isStreaming) return

    const userMessageId = `user-${Date.now()}`
    const assistantMessageId = `agent-${Date.now()}`

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
      const response = await apiFetch('/chat/stream', {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream'
        },
        body: {
          message,
          thread_id: threadId ?? activeThreadId,
          provider,
          model
        }
      })

      if (!response.body) 
        throw new Error('Servidor retornou resposta sem corpo de stream.')

      for await (const { event, data } of parseSseStream(response)) {
        try {
          const parsed = JSON.parse(data)

          if (event === 'session' && parsed.thread_id) 
            setActiveThreadId(parsed.thread_id)

          setMessages((prev) =>
            updateMessageById(prev, assistantMessageId, (msg) =>
              applySseEventToMessage(msg, event, parsed)
            )
          )
        } catch {
          // Ignora payloads não-JSON
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na comunicação com o assistente.'
      setMessages((prev) =>
        updateMessageById(prev, assistantMessageId, (msg) =>
          applyNetworkErrorToMessage(msg, errorMsg)
        )
      )
    } finally {
      setIsStreaming(false)
      setMessages(prev =>
        updateMessageById(prev, assistantMessageId, (msg) => ({
          ...msg,
          isStreaming: false
        }))
      )
    }
  }

  const clearMessages = () => {
    setMessages([])
    setActiveThreadId(null)
  }

  return {
    messages,
    isStreaming,
    activeThreadId,
    sendMessage,
    clearMessages
  }
}
