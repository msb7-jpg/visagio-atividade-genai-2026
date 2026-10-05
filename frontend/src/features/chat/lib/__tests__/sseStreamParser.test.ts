import { parseSseStream } from '@/features/chat/lib/sseStreamParser'
import { describe, expect, it } from 'vitest'

function createMockSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}

describe('parseSseStream Generator', () => {
  it('decodifica eventos SSE formatados com event e data', async () => {
    const rawData = [
      'event: session\ndata: {"thread_id": "t1"}\n\n',
      'event: token\ndata: {"token": "Olá"}\n\n'
    ]

    const response = createMockSseResponse(rawData)
    const events: { event: string; data: string }[] = []

    for await (const sseEvent of parseSseStream(response)) {
      events.push(sseEvent)
    }

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ event: 'session', data: '{"thread_id": "t1"}' })
    expect(events[1]).toEqual({ event: 'token', data: '{"token": "Olá"}' })
  })

  it('encerra imediatamente e sem emitir eventos quando signal já estiver cancelado', async () => {
    const controller = new AbortController()
    controller.abort()

    const response = createMockSseResponse(['event: session\ndata: {"thread_id": "t1"}\n\n'])
    const events: { event: string; data: string }[] = []

    for await (const sseEvent of parseSseStream(response, controller.signal)) {
      events.push(sseEvent)
    }

    expect(events).toHaveLength(0)
  })

  it('cancela leitura do reader e interrompe loop quando controller.abort() é disparado no meio', async () => {
    const controller = new AbortController()
    const encoder = new TextEncoder()

    let cancelled = false
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('event: step\ndata: {"step": "1"}\n\n'))
      },
      cancel() {
        cancelled = true
      }
    })

    const response = new Response(stream)
    const events: { event: string; data: string }[] = []

    for await (const sseEvent of parseSseStream(response, controller.signal)) {
      events.push(sseEvent)
      controller.abort()
    }

    expect(events).toHaveLength(1)
    expect(events[0].event).toBe('step')
    expect(cancelled).toBe(true)
  })
})
