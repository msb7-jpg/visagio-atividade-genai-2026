export interface SseEvent {
  event: string
  data: string
}

/**
 * Lê e decodifica assincronamente linhas de um stream HTTP SSE gerando objetos { event, data }.
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
        if (!trimmed) continue

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace('event:', '').trim()
          continue
        }

        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.replace('data:', '').trim()
          yield {
            event: currentEvent,
            data: dataStr
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
