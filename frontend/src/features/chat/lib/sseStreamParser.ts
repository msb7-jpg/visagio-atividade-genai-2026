export interface SseEvent {
  event: string
  data: string
}

interface ProcessedLineResult {
  nextEvent: string
  eventToYield?: SseEvent
}

/**
 * Processa uma única linha de texto SSE e retorna a transição de evento e possível payload emitido.
 */
function processSseLine(trimmed: string, currentEvent: string): ProcessedLineResult {
  if (!trimmed) {
    return { nextEvent: 'message' }
  }
  if (trimmed.startsWith('event:')) {
    return { nextEvent: trimmed.slice(6).trim() }
  }
  if (trimmed.startsWith('data:')) {
    return {
      nextEvent: currentEvent,
      eventToYield: { event: currentEvent, data: trimmed.slice(5).trim() }
    }
  }
  return { nextEvent: currentEvent }
}

/**
 * Extrai eventos estruturados de um buffer de texto combinado com um novo chunk.
 */
function extractSseEventsFromBuffer(
  rawBuffer: string,
  decoder: TextDecoder,
  chunk: Uint8Array,
  currentEvent: string
): { remainingBuffer: string; events: SseEvent[]; nextEvent: string } {
  const combined = rawBuffer + decoder.decode(chunk, { stream: true })
  const lines = combined.split('\n')
  const remainingBuffer = lines.pop() ?? ''
  const events: SseEvent[] = []
  let activeEvent = currentEvent

  for (const line of lines) {
    const result = processSseLine(line.trim(), activeEvent)
    activeEvent = result.nextEvent
    if (result.eventToYield) {
      events.push(result.eventToYield)
    }
  }

  return { remainingBuffer, events, nextEvent: activeEvent }
}

/**
 * Limpa o leitor de stream fechando conexões pendentes caso abortado.
 */
function cleanupReader(reader: ReadableStreamDefaultReader<Uint8Array>, isAborted?: boolean): void {
  try {
    if (isAborted) {
      void reader.cancel().catch(() => {})
    }
  } finally {
    reader.releaseLock()
  }
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
    signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    while (!signal?.aborted) {
      const { value, done } = await reader.read()
      if (done || !value) break

      const extracted = extractSseEventsFromBuffer(buffer, decoder, value, currentEvent)
      buffer = extracted.remainingBuffer
      currentEvent = extracted.nextEvent

      for (const sseEvent of extracted.events) {
        if (signal?.aborted) break
        yield sseEvent
      }
    }

    const trailing = processSseLine(buffer.trim(), currentEvent)
    if (!signal?.aborted && trailing.eventToYield) {
      yield trailing.eventToYield
    }
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onAbort)
    }
    cleanupReader(reader, signal?.aborted)
  }
}
