export interface SseEvent {
  event: string
  data: string
}

/**
 * Lê e decodifica assincronamente linhas de um stream HTTP SSE gerando eventos estruturados com `event` e `data`.
 */
export async function* parseSseStream(response: Response): AsyncGenerator<SseEvent, void, unknown> {
  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let currentEvent = 'message'

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
          currentEvent = 'message'
          continue
        }

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim()
        } else if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim()
          yield { event: currentEvent, data }
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      const data = buffer.trim().slice(5).trim()
      yield { event: currentEvent, data }
    }
  } finally {
    reader.releaseLock()
  }
}
