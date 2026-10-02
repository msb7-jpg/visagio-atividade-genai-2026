import { useState } from 'react'
import type { AgentStepItem, ChatMessageItem } from '@/features/chat/types/chat.types'

interface SendMessageOptions {
  message: string
  threadId?: string
  provider?: string
  model?: string
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
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify({
          message,
          thread_id: threadId ?? activeThreadId,
          provider,
          model
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
                if (parsed.model || parsed.provider) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            provider: parsed.provider ?? msg.provider,
                            model: parsed.model ?? msg.model
                          }
                        : msg
                    )
                  )
                }
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
              } else if (currentEvent === 'error') {
                const errorMsg = parsed.message || parsed.error || 'Erro no processamento da solicitação.'
                const errorCode = parsed.error_code || 'AGENT_ERROR'
                const rawError = parsed.error || errorMsg

                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id !== assistantMessageId) return msg

                    let updatedSteps = msg.steps
                    if (updatedSteps.length > 0) {
                      updatedSteps = updatedSteps.map((stepItem, idx) =>
                        idx === updatedSteps.length - 1
                          ? { ...stepItem, status: 'error' as const }
                          : stepItem
                      )
                    } else {
                      updatedSteps = [
                        {
                          step: 'error',
                          label: 'Falha na execução do modelo',
                          status: 'error' as const
                        }
                      ]
                    }

                    return {
                      ...msg,
                      content: errorMsg,
                      blocks: [
                        ...msg.blocks.filter((blockItem) => blockItem.type !== 'error'),
                        {
                          id: `err-${Date.now()}`,
                          type: 'error' as const,
                          message: errorMsg,
                          code: errorCode,
                          rawError: rawError !== errorMsg ? rawError : undefined
                        }
                      ],
                      steps: updatedSteps
                    }
                  })
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
        prev.map((msg) => {
          if (msg.id !== assistantMessageId) return msg
          const updatedSteps =
            msg.steps.length > 0
              ? msg.steps.map((stepItem, idx) =>
                idx === msg.steps.length - 1
                  ? { ...stepItem, status: 'error' as const }
                  : stepItem
              )
              : [
                {
                  step: 'error',
                  label: 'Falha de conexão',
                  status: 'error' as const
                }
              ]

          return {
            ...msg,
            content: errorMsg,
            blocks: [
              ...msg.blocks.filter((blockItem) => blockItem.type !== 'error'),
              {
                id: `err-${Date.now()}`,
                type: 'error' as const,
                message: errorMsg,
                code: 'NETWORK_ERROR'
              }
            ],
            steps: updatedSteps
          }
        })
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
