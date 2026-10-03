import {
  CHAT_BLOCK_TYPE,
  SSE_EVENT,
  STEP_STATUS,
  type AgentStepItem,
  type ChatJsConfigDTO,
  type ChatMessageBlock,
  type ChatMessageItem,
  type SseChartPayload,
  type SseDataPayload,
  type SseErrorPayload,
  type SseEventType,
  type SseSessionPayload,
  type SseSqlPayload,
  type SseStepEndPayload,
  type SseThoughtPayload,
  type SseTokenPayload
} from '@/features/chat/types/chat.types'

/**
 * Insere ou substitui um bloco de conteúdo na mensagem baseado no tipo discriminado.
 *
 * @param blocks - Lista atual de blocos da mensagem.
 * @param newBlock - Novo bloco a ser inserido ou atualizado.
 * @returns Nova lista de blocos com o elemento atualizado.
 */
function upsertBlock(blocks: ChatMessageBlock[], newBlock: ChatMessageBlock): ChatMessageBlock[] {
  return [...blocks.filter(block => block.type !== newBlock.type), newBlock]
}

/**
 * Marca a última etapa do agente como falha ou cria uma etapa de erro caso a lista esteja vazia.
 *
 * @param steps - Lista de etapas do agente observadas até o momento.
 * @param fallbackLabel - Rótulo a ser exibido caso nenhuma etapa anterior exista.
 * @returns Nova lista de etapas com o último item em estado de erro.
 */
function markLastStepFailed(steps: AgentStepItem[], fallbackLabel: string): AgentStepItem[] {
  if (steps.length === 0) {
    return [{
      step: 'error',
      label: fallbackLabel,
      status: STEP_STATUS.ERROR
    }]
  }

  return steps.with(-1, { ...steps.at(-1)!, status: STEP_STATUS.ERROR })
}

type EventHandler<TPayload> = (msg: ChatMessageItem, payload: TPayload) => ChatMessageItem

const handleSession: EventHandler<SseSessionPayload> = (msg, payload) => ({
  ...msg,
  provider: payload.provider ?? msg.provider,
  model: payload.model ?? msg.model
})

const handleStepEnd: EventHandler<SseStepEndPayload> = (msg, payload) => {
  const stepItem: AgentStepItem = {
    step: payload.step,
    label: payload.label,
    status: payload.status,
    duration_ms: payload.duration_ms
  }
  return {
    ...msg,
    steps: [...msg.steps.filter(step => step.step !== payload.step), stepItem]
  }
}

const handleThought: EventHandler<SseThoughtPayload> = (msg, payload) => {
  if (!payload.thought) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `th-${Date.now()}`,
      type: CHAT_BLOCK_TYPE.THOUGHT,
      content: payload.thought
    })
  }
}

const handleSql: EventHandler<SseSqlPayload> = (msg, payload) => {
  if (!payload.sql) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `sql-${Date.now()}`,
      type: CHAT_BLOCK_TYPE.SQL,
      query: payload.sql,
      rawQuery: payload.raw
    })
  }
}

const handleChart: EventHandler<SseChartPayload | ChatJsConfigDTO> = (msg, payload) => {
  if (!payload.type || !payload.datasets) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `chart-${Date.now()}`,
      type: CHAT_BLOCK_TYPE.CHART,
      config: payload
    })
  }
}

const handleData: EventHandler<SseDataPayload> = (msg, payload) => {
  if (!payload.rows) return msg
  return {
    ...msg,
    blocks: upsertBlock(msg.blocks, {
      id: `data-${Date.now()}`,
      type: CHAT_BLOCK_TYPE.DATA,
      rows: payload.rows
    })
  }
}

const handleToken: EventHandler<SseTokenPayload> = (msg, payload) => {
  if (!payload.token) return msg
  return {
    ...msg,
    content: payload.token,
    blocks: upsertBlock(msg.blocks, {
      id: `text-${Date.now()}`,
      type: CHAT_BLOCK_TYPE.TEXT,
      content: payload.token
    })
  }
}

const handleError: EventHandler<SseErrorPayload> = (msg, payload) => {
  const errorMsg = payload.message || payload.error || 'Erro no processamento da solicitação.'
  const errorCode = payload.error_code || 'AGENT_ERROR'
  const rawError = payload.error || errorMsg

  return {
    ...msg,
    content: errorMsg,
    blocks: upsertBlock(msg.blocks, {
      id: `err-${Date.now()}`,
      type: CHAT_BLOCK_TYPE.ERROR,
      message: errorMsg,
      code: errorCode,
      rawError: rawError !== errorMsg ? rawError : undefined
    }),
    steps: markLastStepFailed(msg.steps, 'Falha na execução do modelo')
  }
}

const EVENT_HANDLERS: Partial<Record<SseEventType, (msg: ChatMessageItem, payload: unknown) => ChatMessageItem>> = {
  [SSE_EVENT.SESSION]: (msg, payload) => handleSession(msg, payload as SseSessionPayload),
  [SSE_EVENT.STEP_END]: (msg, payload) => handleStepEnd(msg, payload as SseStepEndPayload),
  [SSE_EVENT.THOUGHT]: (msg, payload) => handleThought(msg, payload as SseThoughtPayload),
  [SSE_EVENT.SQL]: (msg, payload) => handleSql(msg, payload as SseSqlPayload),
  [SSE_EVENT.CHART]: (msg, payload) => handleChart(msg, payload as SseChartPayload),
  [SSE_EVENT.DATA]: (msg, payload) => handleData(msg, payload as SseDataPayload),
  [SSE_EVENT.TOKEN]: (msg, payload) => handleToken(msg, payload as SseTokenPayload),
  [SSE_EVENT.ERROR]: (msg, payload) => handleError(msg, payload as SseErrorPayload)
}

/**
 * Aplica um evento SSE individual à mensagem em progresso, delegando para o manipulador correspondente.
 *
 * @param msg - Mensagem de chat atual no estado do cliente.
 * @param event - Nome do evento SSE recebido do servidor.
 * @param parsed - Dados decodificados do evento em JSON.
 * @returns Mensagem atualizada com os novos blocos ou metadados de execução.
 */
export function applySseEventToMessage(
  msg: ChatMessageItem,
  event: SseEventType | string,
  parsed: unknown
): ChatMessageItem {
  const handler = EVENT_HANDLERS[event as SseEventType]
  return handler ? handler(msg, parsed) : msg
}

/**
 * Atualiza a mensagem anexando um bloco de erro de rede e marcando a timeline com falha.
 *
 * @param msg - Mensagem atual do chat.
 * @param errorMsg - Mensagem descritiva do erro de conexão ocorrido no transporte HTTP.
 * @returns Mensagem com o bloco de erro adicionado.
 */
export function applyNetworkErrorToMessage(
  msg: ChatMessageItem,
  errorMsg: string
): ChatMessageItem {
  return {
    ...msg,
    content: errorMsg,
    blocks: upsertBlock(msg.blocks, {
      id: `err-${Date.now()}`,
      type: CHAT_BLOCK_TYPE.ERROR,
      message: errorMsg,
      code: 'NETWORK_ERROR'
    }),
    steps: markLastStepFailed(msg.steps, 'Falha de conexão')
  }
}
