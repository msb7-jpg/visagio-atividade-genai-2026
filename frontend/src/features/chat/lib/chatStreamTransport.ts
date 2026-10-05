import { parseSseStream } from '@/features/chat/lib/sseStreamParser'
import { SSE_EVENT } from '@/features/chat/types/chat.types'
import { apiFetch } from '@/lib/api-client'

/**
 * Parâmetros de envio da mensagem para iniciar o streaming analítico.
 */
export interface StreamChatPayload {
  /** Pergunta ou comando analítico enviado pelo usuário. */
  message: string
  /** Identificador de conversa pré-existente ou nulo para iniciar nova sessão. */
  threadId?: string | null
  /** Provedor de LLM explicitamente selecionado. */
  provider?: string
  /** Modelo de LLM explicitamente selecionado. */
  model?: string
}

/**
 * Callbacks de notificação invocados à medida que eventos SSE chegam do servidor.
 */
export interface StreamChatCallbacks {
  /** Invocado quando o identificador de sessão é estabelecido ou confirmado. */
  onSession: (threadId: string) => void
  /** Invocado quando um título sintetizado para a conversa é recebido. */
  onTitle: (title: string) => void
  /** Invocado para cada evento atômico (pensamento, sql, gráfico, dados, token, erro). */
  onEvent: (event: string, parsedData: unknown) => void
}

/**
 * Executa requisição POST para /chat/stream e consome os eventos Server-Sent Events recebidos.
 *
 * @param payload - Dados da mensagem e identificadores de sessão/modelo.
 * @param callbacks - Manipuladores dos eventos do ciclo de vida da transmissão.
 * @param signal - Sinal opcional para cancelamento/aborto da transmissão.
 * @returns Promessa resolvida quando o streaming for finalizado com sucesso.
 * @throws Error se o corpo da resposta HTTP for nulo ou falhar.
 */
export async function executeChatStream(
  payload: StreamChatPayload,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException('The user aborted a request.', 'AbortError')
  }

  const response = await apiFetch('/chat/stream', {
    method: 'POST',
    signal,
    headers: {
      Accept: 'text/event-stream'
    },
    body: {
      message: payload.message,
      thread_id: payload.threadId,
      provider: payload.provider,
      model: payload.model
    }
  })

  if (!response.body) {
    throw new Error('Servidor retornou resposta sem corpo de stream.')
  }

  for await (const { event, data } of parseSseStream(response, signal)) {
    if (signal?.aborted) {
      throw new DOMException('The user aborted a request.', 'AbortError')
    }

    try {
      const parsed = JSON.parse(data)

      if (event === SSE_EVENT.SESSION && parsed.thread_id) {
        callbacks.onSession(parsed.thread_id)
      }

      if (event === SSE_EVENT.TITLE && parsed.title) {
        callbacks.onTitle(parsed.title)
      }

      callbacks.onEvent(event, parsed)
    } catch {
      // Ignora payloads não-JSON
    }
  }

  if (signal?.aborted) {
    throw new DOMException('The user aborted a request.', 'AbortError')
  }
}
