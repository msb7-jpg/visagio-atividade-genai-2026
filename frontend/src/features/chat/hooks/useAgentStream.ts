import { useState } from 'react'
import type { AgentStepItem, ChatMessageItem } from '@/features/chat/types/chat.types'

interface SendMessageOptions {
  message: string
  threadId?: string
}

export function useAgentStream() {
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  const sendMessage = async ({ message, threadId }: SendMessageOptions) => {
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
      isStreaming: true
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    try {
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify({
          message,
          thread_id: threadId ?? activeThreadId
        })
      })

      if (!response.ok || !response.body) {
        throw new Error(`Erro na conexão com o servidor: HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let currentEvent = 'message'
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.replace('event:', '').trim()
            continue
          }

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace('data:', '').trim()
            try {
              const parsed = JSON.parse(dataStr)

              if (currentEvent === 'session' && parsed.thread_id) {
                setActiveThreadId(parsed.thread_id)
              } else if (currentEvent === 'step_end') {
                const stepItem: AgentStepItem = {
                  step: parsed.step,
                  label: parsed.label,
                  status: parsed.status,
                  duration_ms: parsed.duration_ms
                }
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                        ...msg,
                        steps: [...msg.steps.filter((item) => item.step !== parsed.step), stepItem]
                      }
                      : msg
                  )
                )
              } else if (currentEvent === 'thought' && parsed.thought) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                        ...msg,
                        blocks: [
                          ...msg.blocks.filter((blockItem) => blockItem.type !== 'thought'),
                          {
                            id: `th-${Date.now()}`,
                            type: 'thought',
                            content: parsed.thought
                          }
                        ]
                      }
                      : msg
                  )
                )
              } else if (currentEvent === 'sql' && parsed.sql) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                        ...msg,
                        blocks: [
                          ...msg.blocks.filter((blockItem) => blockItem.type !== 'sql'),
                          {
                            id: `sql-${Date.now()}`,
                            type: 'sql',
                            query: parsed.sql,
                            rawQuery: parsed.raw
                          }
                        ]
                      }
                      : msg
                  )
                )
              } else if (currentEvent === 'data' && parsed.rows) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                        ...msg,
                        blocks: [
                          ...msg.blocks.filter((blockItem) => blockItem.type !== 'data'),
                          {
                            id: `data-${Date.now()}`,
                            type: 'data',
                            rows: parsed.rows
                          }
                        ]
                      }
                      : msg
                  )
                )
              } else if (currentEvent === 'token' && parsed.token) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                        ...msg,
                        content: parsed.token,
                        blocks: [
                          ...msg.blocks.filter((blockItem) => blockItem.type !== 'text'),
                          {
                            id: `text-${Date.now()}`,
                            type: 'text',
                            content: parsed.token
                          }
                        ]
                      }
                      : msg
                  )
                )
              }
            } catch {
              // ignore parse errors for non-JSON lines
            }
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na comunicação com o assistente.'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
              ...msg,
              content: `⚠️ ${errorMsg}`,
              blocks: [
                ...msg.blocks,
                { id: `err-${Date.now()}`, type: 'text', content: `⚠️ ${errorMsg}` }
              ]
            }
            : msg
        )
      )
    } finally {
      setIsStreaming(false)
      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg))
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
