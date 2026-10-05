export interface SseEvent {
  event: string
  data: string
}

/**
 * Lê e decodifica assincronamente linhas de um stream HTTP SSE gerando eventos estruturados com `event` e `data`.
 * Possui suporte a cancelamento antecipado via AbortSignal, liberando o leitor e fechando a conexão.
 *
 * @param response - Objeto Response do fetch contendo o ReadableStream.
 * @param signal - Sinal opcional de cancelamento (AbortSignal).
 * @returns Gerador assíncrono que emite eventos SSE individuais.
 */
export async function* parseSseStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<SseEvent, void, unknown> {
  if (!response.body || signal?.aborted) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let currentEvent = 'message'

  const onAbort = () => {
    void reader.cancel().catch(() => {})
  }

  if (signal) {
    if (signal.aborted) {
      void reader.cancel().catch(() => {})
      reader.releaseLock()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    while (!signal?.aborted) {
      const { value, done } = await reader.read()
      if (done || signal?.aborted) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (signal?.aborted) break

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

    if (!signal?.aborted && buffer.trim().startsWith('data:')) {
      const data = buffer.trim().slice(5).trim()
      yield { event: currentEvent, data }
    }
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onAbort)
    }
    try {
      if (signal?.aborted) {
        void reader.cancel().catch(() => {})
      }
    } finally {
      reader.releaseLock()
    }
  }
}
